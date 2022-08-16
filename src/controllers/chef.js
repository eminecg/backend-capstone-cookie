const _ = require('lodash');
const Chefs = require('../models/user').Chef;
const Dishes = require('../models/dish');
const Orders = require('../models/order');
const {
  createLocation,
  updateLocationById,
  deleteLocationById,
} = require('./customer');
const provincesOfTurkey = require('../helpers/provincesOfTurkey');

const chefControllers = {};

chefControllers.getAllChefs = async (req, res) => {
  const chefs = await Chefs.find({});
  if (!chefs) return res.json({ message: 'No chefs to show at this time' });
  return res.json(chefs);
};

chefControllers.getNearbyChefs = async (req, res) => {
  let { city } = req.query;
  city = _.capitalize(city);
  if (!provincesOfTurkey.includes(city))
    return res.status(400).json({ message: 'Wrong city name' });
  const chefs = await Chefs.find({});
  if (!chefs) return res.json({ message: 'No chefs to show at this time' });
  const nearbyChefs = [];
  chefs.forEach((chef) => {
    chef.locations.forEach((location) => {
      if (location.city === city) nearbyChefs.push(chef);
    });
  });

  if (nearbyChefs.length === 0)
    return res.json({ message: `No chefs in ${city} province at this time` });

  return res.json(nearbyChefs);
};

chefControllers.getSpecificChef = async (req, res) => {
  const { username } = req.params;
  const chef = await Chefs.findOne({ username });
  if (!chef) return res.json({ message: `No chef with username: ${username}` });
  return res.json(chef);
};

chefControllers.getAllDishes = async (req, res) => {
  const dishes = await Dishes.find({});
  if (!dishes) return res.json({ message: 'No dishes to show at this time' });
  return res.json(dishes);
};

chefControllers.getSpecificDish = async (req, res) => {
  const { dishId } = req.params;
  const dish = await Dishes.findOne({ _id: dishId });
  if (!dish) return res.status(400).json({ message: "Dish isn't available" });
  return res.json(dish);
};

chefControllers.filterDishes = async (req, res) => {
  const queries = {};
  const filteringProperties = [
    'title',
    'cuisine',
    'dish_type',
    'price',
    'ingredients',
  ];

  // to avoid wrong or empty queries
  const properties = Object.keys(req.query);
  properties.forEach((prop) => {
    if (filteringProperties.includes(prop) && req.query[prop]) {
      if (prop === 'price') {
        // query example: price=44-77
        const [min, max] = req.query[prop].split('-');
        queries[prop] = { $gte: +min, $lte: +max };
      } else if (prop === 'cuisine' || prop === 'dish_type') {
        // Start case (First letter of each word capitalized) to match enums in the schema
        queries[prop] = _.startCase(_.toLower(req.query[prop]));
      } else queries[prop] = req.query[prop];
    }
  });

  const results = await Dishes.find(queries);

  if (_.isEmpty(queries)) res.status(400).json({ message: 'Invalid query!' });
  else if (results.length === 0)
    res.status(400).json({ message: 'Results not found' });
  else {
    res.json(results);
  }
};

chefControllers.getChefDishes = async (req, res) => {
  try {
    const { username } = req.params;
    const chef = await Chefs.findOne({ username }).populate('dishes');
    if (chef) {
      const chefDishes = chef.dishes;
      if (chefDishes.length !== 0) {
        res.json(chefDishes);
      } else
        res.json({
          message: `No available dishes for chef: ${username} for now`,
        });
    } else res.json({ message: `No chef with username: ${username}` });
  } catch (err) {
    res.json({ error: err.message });
  }
};

chefControllers.seeProfile = async (req, res) => {
  const { username } = req.params;
  const { _id } = req.user;
  const chef = await Chefs.findOne({ _id, username });
  if (!chef)
    return res
      .status(401)
      .send("You don't have authorization to view this page");
  return res.json(chef);
};

chefControllers.updateProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const { _id } = req.user;
    const chef = await Chefs.findOne({ _id, username });
    if (!chef)
      res.status(401).send("You don't have authorization to view this page");
    else {
      const dataToBeUpdated = {};

      // to avoid updating with empty values
      const properties = Object.keys(req.body);
      properties.forEach((prop) => {
        if (req.body[prop]) dataToBeUpdated[prop] = req.body[prop];
      });

      const updatedChef = await Chefs.findByIdAndUpdate(_id, dataToBeUpdated, {
        new: true,
      });
      res.json(updatedChef);
    }
  } catch (err) {
    res.json({ error: err.message });
  }
};

// Note: we can move the location controllers to a separate file as they're for customers and chefs and generalize them
// Bug to be fixed: I can add a location for any user when I'm signed in
chefControllers.addLocation = createLocation;
chefControllers.updateLocation = updateLocationById;
chefControllers.deleteLocation = deleteLocationById;

chefControllers.addDish = async (req, res) => {
  try {
    const { username } = req.params;
    const { _id } = req.user;
    const relatedChef = await Chefs.findOne({ _id, username });
    if (!relatedChef)
      res.status(401).send("You don't have authorization to view this page");
    else {
      const { _id: chefId } = relatedChef;
      const { title, ingredients, description, images, price } = req.body;
      let { cuisine, dishType } = req.body;
      cuisine = _.capitalize(cuisine);
      dishType = _.startCase(_.toLower(dishType));

      const newDish = await Dishes.create({
        chef_id: chefId,
        title,
        ingredients,
        description,
        cuisine,
        dish_type: dishType,
        images,
        price,
      });

      relatedChef.dishes.push(newDish);
      await relatedChef.save();

      res.json(newDish);
    }
  } catch (err) {
    res.json({ error: err.message });
  }
};

chefControllers.updateDishInfos = async (req, res) => {
  try {
    const { username, dishId } = req.params;
    const { _id } = req.user;
    const relatedChef = await Chefs.findOne({ _id, username });
    if (!relatedChef)
      res.status(401).send("You don't have authorization to view this page");
    else {
      const isDishForRelatedChef = await Dishes.findOne({
        _id: dishId,
        chef_id: _id,
      });
      if (isDishForRelatedChef) {
        const dataToBeUpdated = {};
        const properties = Object.keys(req.body);
        properties.forEach((prop) => {
          if (req.body[prop]) {
            if (prop === 'dishType') dataToBeUpdated.dish_type = req.body[prop];
            else dataToBeUpdated[prop] = req.body[prop];
          }
        });
        const updatedDish = await Dishes.findByIdAndUpdate(
          dishId,
          dataToBeUpdated,
          {
            new: true,
          }
        );
        updatedDish.edited_at = Date.now();
        res.json(updatedDish);
      } else
        res.status(401).send("You don't have authorization to view this page");
    }
  } catch (err) {
    res.json({ error: err.message });
  }
};

chefControllers.deleteDish = async (req, res) => {
  try {
    const { username, dishId } = req.params;
    const { _id } = req.user;
    const relatedChef = await Chefs.findOne({ _id, username });
    if (!relatedChef)
      res.status(401).send("You don't have authorization to view this page");
    else {
      const isDishForRelatedChef = await Dishes.findOne({
        _id: dishId,
        chef_id: _id,
      });
      if (isDishForRelatedChef) {
        await Dishes.findByIdAndDelete(dishId);
        res.json('Dish has been deleted successfully');
      } else
        res.status(401).send("You don't have authorization to view this page");
    }
  } catch (err) {
    res.json({ error: err.message });
  }
};

// Note: the following order controllers aren't tested on postman since order functionality isn't working properly yet.

chefControllers.getOrders = async (req, res) => {
  try {
    const { username } = req.params;
    const { _id } = req.user;
    const relatedChef = await Chefs.findOne({ _id, username });
    if (!relatedChef)
      res.status(401).send("You don't have authorization to view this page");
    else {
      const orders = await Orders.find({
        dishes: { $elemMatch: { 'dish.chef_id': _id } },
      });
      if (orders.length === 0) res.json({ message: 'No orders for now' });
      else res.json(orders);
    }
  } catch (err) {
    res.json({ error: err.message });
  }
};

chefControllers.finishPreparation = async (req, res) => {
  try {
    const { username, orderId } = req.params;
    const { _id } = req.user;
    const relatedChef = await Chefs.findOne({ _id, username });
    if (!relatedChef)
      res.status(401).send("You don't have authorization to view this page");
    else {
      const order = await Orders.findOne({ _id: orderId });
      if (!order)
        res.status(400).json({ message: 'wrong query for the order' });
      else {
        order.status = 'completed';
        await order.save();
        res.json(order);
      }
    }
  } catch (err) {
    res.json({ error: err.message });
  }
};

module.exports = chefControllers;
