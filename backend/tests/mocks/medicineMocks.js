// Mock data for medicine ordering tests
// Aligned with actual Medicine & Order schemas in /backend/models/
//
// Medicine schema fields: name, medicineID, quantity, cost, manufacturer, expiryDate, supplierId
//   NOTE: the field is 'cost' (not 'price'), 'manufacturer' (not 'company')
//
// Order schema:
//   status enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
//   paymentMethod enum: ['cod', 'card', 'upi']
//   deliveryAddress requires: street, city, state, zip, country
const mongoose = require('mongoose');

const mockMedicineData = {
  valid: {
    name: 'Aspirin',
    medicineID: 'MED001',
    manufacturer: 'Bayer AG',         // actual field: 'manufacturer' (not 'company')
    cost: 150,                         // actual field: 'cost' (not 'price')
    quantity: 100,
    expiryDate: new Date('2027-12-31'),
    supplierId: new mongoose.Types.ObjectId()
  },
  validMultiple: [
    {
      name: 'Paracetamol',
      medicineID: 'MED002',
      manufacturer: 'GSK',
      cost: 50,
      quantity: 200
    },
    {
      name: 'Ibuprofen',
      medicineID: 'MED003',
      manufacturer: 'Pfizer',
      cost: 120,
      quantity: 150
    }
  ],
  invalid: {
    name: '',
    medicineID: '',
    cost: -100,     // Invalid: cost must be >= 0
    quantity: -50   // Invalid: quantity must be >= 0
  },
  outOfStock: {
    name: 'Out of Stock Medicine',
    medicineID: 'MED999',
    cost: 200,
    quantity: 0
  }
};

const mockCartData = {
  validAddToCart: {
    medicineId: new mongoose.Types.ObjectId(),
    quantity: 5
  },
  multipleItems: [
    { medicineId: new mongoose.Types.ObjectId(), quantity: 2 },
    { medicineId: new mongoose.Types.ObjectId(), quantity: 3 }
  ],
  invalidQuantity: {
    medicineId: new mongoose.Types.ObjectId(),
    quantity: -1
  }
};

const mockOrderData = {
  // quantity=5, cost=150 per unit => totalCost=750
  validOrder: {
    patientId: new mongoose.Types.ObjectId(),
    medicineId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    quantity: 5,
    totalCost: 750,                 // 5 * 150 = 750
    paymentMethod: 'card',          // Order schema enum: ['cod', 'card', 'upi']
    status: 'pending',
    deliveryAddress: {
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip: '400001',
      country: 'India'              // required by Order addressSchema
    }
  },
  validConfirmedOrder: {
    patientId: new mongoose.Types.ObjectId(),
    medicineId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    quantity: 3,
    totalCost: 450,
    paymentMethod: 'upi',          // Order schema enum: ['cod', 'card', 'upi']
    status: 'confirmed'
  },
  invalidOrder: {
    patientId: 'invalid',
    quantity: 0,
    totalCost: -100
  }
};

const mockCheckoutData = {
  validCheckout: {
    paymentMethod: 'card',         // Order schema enum: ['cod', 'card', 'upi']
    cardDetails: {
      number: '4111111111111111',
      cvv: '123',
      expiryDate: '12/26'
    },
    deliveryAddress: {
      street: '456 Oak Ave',
      city: 'Delhi',
      state: 'Delhi',
      zip: '110001',
      country: 'India'
    }
  },
  invalidCheckout: {
    paymentMethod: 'invalid',      // Not in ['cod', 'card', 'upi']
    cardDetails: {}
  },
  upiCheckout: {
    paymentMethod: 'upi',
    upiId: 'user@bankname'
  },
  codCheckout: {
    paymentMethod: 'cod'
  }
};

module.exports = {
  mockMedicineData,
  mockCartData,
  mockOrderData,
  mockCheckoutData
};
