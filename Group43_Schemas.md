# Database Schemas

## 1. Patient Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| name | String | Yes | No | Patient's full name |
| email | String | Yes | Yes | Email address for login |
| mobile | String | Yes | No | Contact phone number |
| address | String | Yes | No | Primary address |
| password | String | Yes | No | Hashed password |
| dateOfBirth | Date | No | No | Date of birth |
| gender | String | No | No | male, female, or other |
| addresses | Array | No | No | Multiple saved addresses with addressSchema |
| profilePhoto | String | No | No | Profile picture URL |
| createdAt | Timestamp | Auto | No | Record creation time |
| updatedAt | Timestamp | Auto | No | Record update time |

Relationships: Patient books Appointments, places Orders, writes Reviews, adds items to Cart, sends Chat messages, writes Blogs.

---

## 2. Doctor Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| documentPath | String | No | No | Path to uploaded documents |
| isApproved | Boolean | No | No | Approved by employee |
| name | String | Yes | No | Doctor's full name |
| email | String | Yes | Yes | Email for login |
| mobile | String | Yes | No | Contact number |
| address | String | Yes | No | Office address |
| registrationNumber | String | Yes | Yes | Medical registration number |
| specialization | String | No | No | Area of expertise |
| college | String | Yes | No | Medical college |
| yearOfPassing | String | Yes | No | Graduation year |
| location | String | Yes | No | Practice location |
| onlineStatus | String | Yes | No | online or offline |
| consultationFee | Number | Yes | No | Consultation fee in rupees |
| dateOfBirth | Date | No | No | Birth date |
| gender | String | No | No | male, female, or other |
| securityCode | String | No | No | security code |
| password | String | Yes | No | Hashed password |
| lastLogin | Date | No | No | Last login timestamp |
| rejectionReason | String | No | No | Reason for rejection |
| isRejected | Boolean | No | No | Rejected by employee |
| profilePhoto | String | No | No | Profile picture URL |
| createdAt | Timestamp | Auto | No | Registration time |
| updatedAt | Timestamp | Auto | No | Last update time |

Relationships: Doctor manages Appointments, creates Prescriptions, writes Reviews, sends Chat messages, writes Blogs. Must be approved by Employee.

---

## 3. Supplier Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| name | String | Yes | No | Company name |
| email | String | Yes | Yes | Email for login |
| mobile | String | Yes | No | Contact number |
| address | String | Yes | No | Business address |
| supplierID | String | Yes | Yes | Unique supplier identifier |
| password | String | Yes | No | Hashed password |
| profilePhoto | String | No | No | Logo or profile picture |
| documentPath | String | No | No | Path to business documents |
| isApproved | Boolean | No | No | Approved by employee |
| approvalStatus | String | No | No | pending, approved, or rejected |
| rejectionReason | String | No | No | Reason for rejection |
| isRejected | Boolean | No | No | Rejected by employee |
| lastLogin | Date | No | No | Last login timestamp |
| createdAt | Timestamp | Auto | No | Registration time |
| updatedAt | Timestamp | Auto | No | Last update time |

Relationships: Supplier provides Medicines, receives Orders, fulfills Orders. Must be approved by Employee.

---

## 4. Employee Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| name | String | Yes | No | Employee's full name |
| email | String | Yes | Yes | Email for login |
| mobile | String | Yes | No | Contact number |
| address | String | Yes | No | Address |
| password | String | Yes | No | Hashed password |
| profilePhoto | String | No | No | Profile picture URL |
| documentPath | String | No | No | Employment documents path |
| isApproved | Boolean | No | No | Approved by admin |
| approvalStatus | String | No | No | pending, approved, or rejected |
| lastLogin | Date | No | No | Last login timestamp |
| createdAt | Timestamp | Auto | No | Creation time |
| updatedAt | Timestamp | Auto | No | Update time |

Relationships: Employee approves Doctors, approves Suppliers, monitors Reviews.

---

## 5. Admin Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| name | String | Yes | No | Admin's full name |
| email | String | Yes | Yes | Email for login |
| mobile | String | Yes | No | Contact number |
| address | String | Yes | No | Address |
| password | String | Yes | No | Hashed password |
| lastLogin | Date | No | No | Last login timestamp |
| createdAt | Timestamp | Auto | No | Creation time |
| updatedAt | Timestamp | Auto | No | Update time |

Relationships: Admin approves Employees, monitors all Reviews, manages all system data.

---

## 6. Appointment Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| patientId | ObjectId (ref: Patient) | Conditional | No | Patient booking appointment |
| doctorId | ObjectId (ref: Doctor) | Yes | No | Doctor providing consultation |
| date | Date | Yes | No | Appointment date |
| time | String | Yes | No | Appointment time in HH:MM |
| status | String | No | No | pending, confirmed, completed, cancelled, blocked |
| type | String | Conditional | No | online or offline |
| consultationFee | Number | Conditional | No | Fee for consultation |
| modeOfPayment | String | No | No | credit-card, upi, net-banking, wallet, cash |
| notes | String | No | No | Appointment notes |
| isBlockedSlot | Boolean | No | No | Whether slot is blocked by doctor |
| doctorNotes | Object | No | No | Doctor's private notes with files array |
| feedback | String | No | No | Patient feedback |
| rating | Number | No | No | Patient rating 0-10 |
| reviewedAt | Date | No | No | When patient reviewed |
| createdAt | Timestamp | Auto | No | Creation time |
| updatedAt | Timestamp | Auto | No | Update time |

Relationships: Links Patient and Doctor. Generates Prescription after completion. Contains Chat messages. Receives feedback and rating from Patient.

---

## 7. Prescription Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| patientName | String | Yes | No | Patient's name |
| patientEmail | String | Yes | No | Patient's email |
| doctorEmail | String | Yes | No | Doctor's email |
| age | Number | Yes | No | Patient's age |
| gender | String | Yes | No | male, female, or other |
| weight | Number | Yes | No | Patient's weight in kg |
| appointmentDate | Date | Yes | No | Related appointment date |
| appointmentTime | String | Yes | No | Related appointment time |
| symptoms | String | Yes | No | Patient's symptoms |
| medicines | Array | Yes | No | Array of prescribed medicines with dosage, frequency, duration |
| additionalNotes | String | No | No | Extra medical notes |
| appointmentId | ObjectId (ref: Appointment) | Yes | No | Associated appointment |
| doctorId | ObjectId (ref: Doctor) | Yes | No | Prescribing doctor |
| patientId | ObjectId (ref: Patient) | Yes | No | Patient receiving prescription |
| createdAt | Timestamp | Auto | No | Creation time |
| updatedAt | Timestamp | Auto | No | Update time |

Relationships: Created after Appointment completion. References Doctor, Patient, and Appointment. Medicines may be ordered from Medicine collection if available.

---

## 8. Medicine Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| name | String | Yes | No | Medicine name |
| medicineID | String | Yes | Yes | Unique medicine identifier |
| quantity | Number | Yes | No | Stock quantity |
| cost | Number | Yes | No | Price per unit in rupees |
| manufacturer | String | Yes | No | Manufacturing company |
| expiryDate | Date | Yes | No | Expiry date |
| image | String | No | No | Product image URL |
| supplierId | ObjectId (ref: Supplier) | Yes | No | Supplier providing medicine |
| createdAt | Timestamp | Auto | No | Added to platform |
| updatedAt | Timestamp | Auto | No | Last updated |

Relationships: Supplied by one Supplier. Added to Cart by Patients. Ordered through Order schema. Quantity decreases as orders are placed.

---

## 9. Order Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| medicineId | ObjectId (ref: Medicine) | Yes | No | Medicine being ordered |
| patientId | ObjectId (ref: Patient) | Yes | No | Patient placing order |
| supplierId | ObjectId (ref: Supplier) | Yes | No | Supplier fulfilling order |
| quantity | Number | Yes | No | Quantity ordered |
| totalCost | Number | No | No | Cost before delivery charge |
| status | String | No | No | pending, confirmed, shipped, delivered, cancelled |
| deliveryAddress | addressSchema | No | No | Delivery address subdocument |
| paymentMethod | String | No | No | cod, card, or upi |
| deliveryCharge | Number | No | No | Shipping fee in rupees |
| finalAmount | Number | No | No | Total = totalCost + deliveryCharge |
| createdAt | Timestamp | Auto | No | Order creation time |
| updatedAt | Timestamp | Auto | No | Last status update |

Relationships: Connects Patient, Medicine, and Supplier. Created from Cart checkout. Supplier updates status during fulfillment.

---

## 10. Cart Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| patientId | ObjectId (ref: Patient) | Yes | Yes | Cart owner (one per patient) |
| items | Array | No | No | Array of cartItemSchema subdocuments |
| createdAt | Timestamp | Auto | No | Creation time |
| updatedAt | Timestamp | Auto | No | Last modification |

cartItemSchema subdocument:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| medicineId | ObjectId (ref: Medicine) | Yes | Medicine in cart |
| quantity | Number | Yes | Quantity to order |

Relationships: One cart per Patient. Contains medicines from Medicine collection. Converted to Order on checkout.

---

## 11. Review Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| userId | ObjectId | Yes | No | ID of reviewer (Patient or Doctor) |
| userType | String | Yes | No | Patient or Doctor (determines userId ref) |
| userName | String | Yes | No | Name of reviewer |
| rating | Number | Yes | No | Star rating 1-5 |
| reviewText | String | Yes | No | Review content 10-1000 characters |
| isApproved | Boolean | No | No | Approved by Employee or Admin |
| createdAt | Date | Auto | No | Submission time |

Relationships: Written by Patient or Doctor. Uses polymorphic reference - userId can reference Patient or Doctor based on userType. Monitored by Employee and Admin.

---

## 12. Blog Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| title | String | Yes | No | Blog post title |
| theme | String | Yes | No | Category or theme |
| content | String | Yes | No | Main blog content |
| authorName | String | Yes | No | Author's name |
| authorEmail | String | Yes | No | Author's email |
| authorType | String | No | No | user, doctor, or employee |
| images | Array | No | No | Array of image URLs |
| createdAt | Date | Auto | No | Publication time |

Relationships: Written by Patient (user), Doctor, or Employee. Searchable by theme and author type.

---

## 13. Chat Schema

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| appointmentId | ObjectId (ref: Appointment) | Yes | No | Associated appointment |
| senderId | ObjectId | Yes | No | Message sender ID |
| senderType | String | Yes | No | patient or doctor |
| message | String | Yes | No | Message content |
| filePath | String | No | No | Path to attached file |
| fileName | String | No | No | Original filename |
| fileType | String | No | No | MIME type of file |
| isFile | Boolean | No | No | Whether message has file |
| timestamp | Date | Auto | No | Message sent time |

Relationships: Linked to specific Appointment. Only Doctor and Patient from that appointment can message. Supports text and file sharing.

---

## Relationships Summary

Patient - Appointment: One-to-Many. Patient's patientId stored in Appointment.patientId.

Patient - Order: One-to-Many. Patient's patientId stored in Order.patientId.

Patient - Cart: One-to-One. Unique patientId in Cart.

Patient - Review: One-to-Many. Patient can write many reviews via polymorphic userId.

Patient - Chat: One-to-Many. Patient sends messages via senderId in Chat.

Doctor - Appointment: One-to-Many. Doctor's doctorId stored in Appointment.doctorId.

Doctor - Prescription: One-to-Many. Doctor's doctorId stored in Prescription.doctorId.

Doctor - Review: One-to-Many. Doctor can write many reviews via polymorphic userId.

Doctor - Chat: One-to-Many. Doctor sends messages via senderId in Chat.

Supplier - Medicine: One-to-Many. Supplier's supplierId stored in Medicine.supplierId.

Supplier - Order: One-to-Many. Supplier's supplierId stored in Order.supplierId.

Medicine - Order: One-to-Many. Medicine's medicineId stored in Order.medicineId.

Medicine - Cart: One-to-Many. Medicine's medicineId stored in Cart items array.

Appointment - Prescription: One-to-One or One-to-Many. Prescription links appointmentId after consultation.

Appointment - Chat: One-to-Many. Multiple Chat messages link to same appointmentId.

Employee - Doctor: Approves via isApproved flag.

Employee - Supplier: Approves via approvalStatus field.

Special Reference: Review uses polymorphic reference with userId and userType fields. userId can reference Patient or Doctor collection based on userType value.

Special Subdocument: addressSchema embedded in Patient addresses array and Order deliveryAddress. cartItemSchema embedded in Cart items array.
