const express = require('express');

const router = express.Router();


const authRoutes = require('./auth');
const customerRoutes = require('./customer');
const chefRoutes = require('./chef');
const adminRoutes = require('./admin');

router.use('/auth', authRoutes);
router.use('/customer', customerRoutes); //    /api/customer
// router.use('/chefs', chefRoutes); //    /api/chefs
router.use('/admin', adminRoutes); //    /api/admin

module.exports = router;

