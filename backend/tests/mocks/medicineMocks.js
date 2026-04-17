// Mock data for medicine ordering tests
const mongoose = require('mongoose');

const mockMedicineData = {
  valid: {
    name: 'Aspirin',
    medicineID: 'MED001',
    company: 'Bayer',
    category: 'Painkiller',
    description: 'Effective pain reliever',
    price: 150,
    quantity: 100,
    supplierId: new mongoose.Types.ObjectId(),
    manufacturer: 'Bayer AG'
  },
  validMultiple: [
    {
      name: 'Paracetamol',
      medicineID: 'MED002',
      company: 'GSK',
      price: 50,
      quantity: 200
    },
    {
      name: 'Ibuprofen',
      medicineID: 'MED003',
      company: 'Pfizer',
      price: 120,
      quantity: 150
    }
  ],
  invalid: {
    name: '',
    medicineID: '',
    price: -100,
    quantity: -50
  },
  outOfStock: {
    name: 'Out of Stock Medicine',
    medicineID: 'MED999',
    price: 200,
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
  validOrder: {
    patientId: new mongoose.Types.ObjectId(),
    medicineId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    quantity: 5,
    totalCost: 750,
    paymentMethod: 'card',
    status: 'pending',
    deliveryAddress: {
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip: '400001'
    }
  },
  validConfirmedOrder: {
    patientId: new mongoose.Types.ObjectId(),
    medicineId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    quantity: 3,
    totalCost: 450,
    paymentMethod: 'upi',
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
    paymentMethod: 'card',
    cardDetails: {
      number: '4111111111111111',
      cvv: '123',
      expiryDate: '12/26'
    },
    deliveryAddress: {
      street: '456 Oak Ave',
      city: 'Delhi',
      state: 'Delhi',
      zip: '110001'
    }
  },
  invalidCheckout: {
    paymentMethod: 'invalid',
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
