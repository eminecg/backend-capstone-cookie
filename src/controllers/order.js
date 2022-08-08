const orderControllers = {};
const orderModel = require('../models/order');
const dishModel = require('../models/dish');
const evaluationModel = require('../models/evaluation');

// GET THE LAST CUSTOEMR ORDER
orderControllers.getCustomerOrder = async (req, res) => {
  const { customerid } = req.params;
  const customerOrder = await orderModel.findOne({ customer: customerid });
  res.json(customerOrder);
};

// GET ALL CUSTOMER PREVIOUS ORDERS
orderControllers.getAllPrevOrders = async (req, res) => {
  const { customerid } = req.params;
  const allCustomerOrders = await orderModel.find({ customer: customerid });
  res.json(allCustomerOrders);
};

// CREATE NEW ORDER
orderControllers.addNewOrder = async (req, res) => {
  const { customerid } = req.params;
  const { dishid, quantity } = req.body;

  let totalPrice = 0;
  const theEvaluation = await evaluationModel.findOne({
    customer_id: customerid,
    dish_id: dishid,
  });
  const existedOrder = orderModel.findOne({
    customer: customerid,
    status: 'adding dishes',
  });

  // CREATE DISH AND QUANTITY PAIRS
  const dishAndQuantity = {
    dish: dishid,
    quantity,
  };

  if (!existedOrder) {
    // CREATE ORDER
    const theOrder = await orderModel.create({
      customer: customerid,
      total_price: totalPrice,
      paid: false,
    });

    // ADD DISH TO ORDER
    theOrder.dishes.push(dishAndQuantity);

    // ADD THE RATE TO THE ORDER
    if (theEvaluation) theOrder.evaluation = theEvaluation;

    // CALCULATE THE PRICE FOR ALL DISHES IN THE ORDER
    theOrder.dishes.forEach(async (elm) => {
      const theDish = await dishModel.findById(elm.dish);
      totalPrice += theDish.price * quantity;
    });

    await theOrder.save();
    res.json(theOrder);
  }

  // ADD NEW DISH TO EXISTED ORDER
  existedOrder.dishes.push(dishAndQuantity);

  // ADD EVALUATION
  if (theEvaluation) existedOrder.evaluation = theEvaluation;

  // CALCULATE THE PRICE FOR ALL DISHES IN THE ORDER
  existedOrder.dishes.forEach(async (elm) => {
    const theDish = await dishModel.findById(elm.dish);
    totalPrice += theDish.price * quantity;
  });

  res.json(existedOrder);
};

// UPDATE ORDER
orderControllers.updateOrder = async (req, res) => {
  const { customerid } = req.params;
  const { dishid, quantity } = req.body;

  const theOrder = await orderModel.findOne({
    customer: customerid,
    status: 'adding dishes',
  });

  theOrder.dishes.forEach(async (dish, index) => {
    if (dish.dish === dishid) {
      theOrder.dishes[index].quantity = quantity;
      await theOrder.save();
    }
  });
  res.send(theOrder);
};

// DELETE ORDER
orderControllers.deleteOrder = async (req, res) => {
  const { customerid } = req.params;
  const theOrder = await orderModel.find({
    customer: customerid,
    status: 'adding dishes',
  });

  if (theOrder) {
    orderModel.deleteOne({
      customer: customerid,
      status: 'adding dishes',
    });
    await orderModel.save();
    res.send(theOrder);
  } else {
    res.send('You dont have an order to delete');
  }
};

module.exports = orderControllers;
