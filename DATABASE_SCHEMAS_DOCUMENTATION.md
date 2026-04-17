# MEDIQUICK Database Schemas Documentation

## Overview

MEDIQUICK is a telemedicine platform built with MongoDB and Mongoose. The database consists of 13 main schemas that handle user management, appointments, prescriptions, medicine ordering, reviews, blogs, and real-time chat between doctors and patients. Each schema has timestamps (createdAt and updatedAt) that get automatically added whenever a record is created or modified.



---

## Patient Schema

The Patient schema stores information about patients who register on the platform. This is one of the main user types.

Fields in Patient schema:

- name (String, required): The full name of the patient. This is mandatory because we need to identify patients by their name.

- email (String, required, unique): Email address of the patient. It must be unique because we use email as the login identifier. No two patients can have the same email in the system.

- mobile (String, required): Mobile phone number of the patient. Required for contact purposes and appointment notifications.

- address (String, required): Primary residential address of the patient. This is the main address field.

- password (String, required): The hashed/encrypted password used for authentication. Passwords are never stored in plain text.

- dateOfBirth (Date, optional): Date of birth of the patient. Useful for age calculation and medical records. Not mandatory at signup.

- gender (String, optional): Gender field can be 'male', 'female', or 'other'. Stored in lowercase. Not required.

- addresses (Array, optional): Patients can save multiple addresses using the addressSchema subdocument. This allows them to have home, work, or other addresses on file. Each address can be marked as default.

- profilePhoto (String, optional): URL to the patient's profile picture. Defaults to '/images/default-patient.svg' if not provided.

- createdAt (Timestamp): Automatically set when the patient record is created.

- updatedAt (Timestamp): Automatically updated whenever the patient modifies their profile.

The addressSchema subdocument inside addresses array contains: label (like 'Home' or 'Work'), street, city, state, zip, country, and isDefault (boolean to mark primary address).

How Patient interacts with other entities:

- A patient can book multiple appointments with different doctors
- A patient can place multiple medicine orders
- A patient can write reviews about doctors
- A patient can add medicines to their cart before ordering
- A patient can have one cart (unique patientId in Cart)
- A patient can chat with doctors during appointments
- A patient can post blogs on the platform

---

## Doctor Schema

The Doctor schema contains information about licensed healthcare professionals on the platform. Doctors go through an approval process before they can accept appointments.

Fields in Doctor schema:

- name (String, required): Full name of the doctor.

- email (String, required, unique): Email address used for login. Must be unique across all doctors.

- mobile (String, required): Contact number for the doctor.

- address (String, required): Office or clinic address.

- registrationNumber (String, required, unique): Medical registration number issued by the medical board. This is unique and validates the doctor's credentials.

- specialization (String, optional): Medical specialization like Cardiology, Neurology, etc.

- college (String, required): Medical college or university where they studied.

- yearOfPassing (String, required): Year the doctor completed their medical degree.

- location (String, required): City or region where they practice.

- onlineStatus (String, enum, default: 'offline'): Can be 'online' or 'offline'. Shows if doctor is currently available for consultations.

- consultationFee (Number, required, default: 100): The fee charged per consultation in rupees. Must be 0 or greater, cannot be negative.

- dateOfBirth (Date, optional): Doctor's birth date.

- gender (String, optional): Can be 'male', 'female', or 'other'.

- password (String, required): Hashed password for authentication.

- documentPath (String, optional): Path to uploaded medical registration documents for verification.

- profilePhoto (String, optional): Doctor's profile picture URL. Defaults to '/images/default-doctor.svg'.

- isApproved (Boolean, default: false): Initially false. Set to true by an employee after document verification. An approved doctor can accept appointments.

- isRejected (Boolean, default: false): Set to true if the employee rejects the doctor's application.

- rejectionReason (String, optional): If rejected, this explains why.

- securityCode (String, optional): Used for two-factor authentication.

- ssn (String, optional): Social security number, can be null.

- lastLogin (Date, optional): Timestamp of when the doctor last logged into the system.

How Doctor interacts with other entities:

- A doctor creates and manages appointments with patients
- A doctor creates prescriptions after consultations
- A doctor can write reviews about patients
- A doctor chats with patients during appointments
- A doctor must be approved by an employee before becoming active
- A doctor's onlineStatus field shows availability for online consultations

---

## Supplier Schema

Suppliers are vendors who provide medicines to the platform. Like doctors, suppliers must be verified and approved by employees.

Fields in Supplier schema:

- name (String, required): Company name of the supplier.

- email (String, required, unique): Email used for login and communication.

- mobile (String, required): Contact phone number.

- address (String, required): Physical business address.

- supplierID (String, required, unique): Unique identifier for the supplier in the system.

- password (String, required): Hashed password.

- profilePhoto (String, optional): Company logo or profile picture. Defaults to '/images/default-supplier.svg'.

- documentPath (String, optional): Path to business registration and license documents.

- isApproved (Boolean, default: false): Set to true after employee approval.

- isRejected (Boolean, default: false): Set to true if application is rejected.

- approvalStatus (String, enum, default: 'pending'): Can be 'pending', 'approved', or 'rejected'. Shows current approval state.

- rejectionReason (String, optional): Explains rejection if applicable.

- lastLogin (Date, optional): Last login timestamp.

How Supplier interacts with other entities:

- A supplier adds and manages medicines in the system
- A supplier updates medicine inventory and prices
- A supplier receives orders from patients
- A supplier updates order status as items are shipped and delivered
- A supplier must be approved by an employee

---

## Employee Schema

Employees are staff members responsible for verifying doctors and suppliers before they can be fully active on the platform.

Fields in Employee schema:

- name (String, required): Employee's full name.

- email (String, required, unique): Email address for login.

- mobile (String, required): Contact number.

- address (String, required): Home or office address.

- password (String, required): Hashed password.

- profilePhoto (String, optional): Profile picture. Defaults to '/images/default-employee.svg'.

- documentPath (String, optional): Path to employment documents and ID.

- isApproved (Boolean, default: false): Must be approved by admin to become active.

- approvalStatus (String, enum, default: 'pending'): Status of employee approval by admin.

- lastLogin (Date, optional): Last login timestamp.

How Employee interacts with other entities:

- An employee views doctor signup applications with their documents
- An employee can approve or reject doctor applications
- An employee views supplier applications and documents
- An employee can approve or reject supplier applications
- An employee monitors all reviews submitted by patients and doctors
- An employee can approve or delete reviews if needed
- An employee must be created by admin and approved by admin

---

## Admin Schema

The Admin schema represents system administrators with full platform access.

Fields in Admin schema:

- name (String, required): Admin's full name.

- email (String, required, unique): Email for login.

- mobile (String, required): Contact number.

- address (String, required): Address on file.

- password (String, required): Hashed password.

- lastLogin (Date, optional): Last login timestamp.

How Admin interacts with other entities:

- An admin creates and manages employee accounts
- An admin approves or rejects employee applications
- An admin can search and view all user data in the system
- An admin monitors all reviews on the platform
- An admin can delete reviews and users if needed
- An admin views analytics about doctors, patients, appointments, and medicines

---

## Appointment Schema

The Appointment schema manages consultations between patients and doctors. An appointment can be online or offline, and goes through different status stages.

Fields in Appointment schema:

- patientId (ObjectId reference to Patient, conditional required): The patient booking the appointment. Not required if this is a blocked slot (doctor blocking their own time).

- doctorId (ObjectId reference to Doctor, required): The doctor who will provide the consultation. Every appointment must have a doctor assigned.

- date (Date, required): The date of the appointment.

- time (String, required): The time in HH:MM format like '14:30' or '09:00'.

- type (String, enum, conditional required): Can be 'online' or 'offline'. Shows if it's a video call or in-person visit. Not required for blocked slots.

- status (String, enum, default: 'pending'): Current status of appointment. Can be 'pending' (waiting for confirmation), 'confirmed' (scheduled), 'completed' (consultation finished), 'cancelled' (by patient or doctor), or 'blocked' (doctor blocked this slot).

- consultationFee (Number, conditional required): The fee charged for this appointment. Not required for blocked slots.

- modeOfPayment (String, enum, optional): How the patient will pay. Can be 'credit-card', 'upi', 'net-banking', 'wallet', 'cash', or null.

- notes (String, optional): Additional notes about the appointment from the patient.

- isBlockedSlot (Boolean, default: false): If true, this time slot is blocked by the doctor and no patient can book it.

- doctorNotes (Object, optional): Doctor's private notes after the consultation. Contains a text field for notes and files array for attachments. Only the doctor can see these notes.

- feedback (String, optional): Feedback given by the patient after consultation.

- rating (Number, optional, range 0-10): Patient's rating of the consultation. Can be from 0 to 10.

- reviewedAt (Date, optional): Timestamp of when the patient left the review.

How Appointment interacts with other entities:

- An appointment links a patient to a doctor at a specific time
- After an appointment is completed, a prescription may be generated
- During an appointment, chat messages between patient and doctor are stored
- After an appointment, patient can leave feedback and rating
- The consultationFee links to the doctor's fee structure
- If isBlockedSlot is true, no patient booking is allowed

---

## Prescription Schema

The Prescription schema stores medical prescriptions created by doctors after appointments. It contains the full medical details.

Fields in Prescription schema:

- patientName (String, required): Name of the patient as recorded.

- patientEmail (String, required): Patient's email for sending the prescription.

- doctorEmail (String, required): Doctor's email who created the prescription.

- age (Number, required): Patient's age at time of consultation.

- gender (String, enum, required): Patient's gender, can be 'male', 'female', or 'other'.

- weight (Number, required): Patient's weight in kilograms.

- appointmentDate (Date, required): The date of the appointment this prescription came from.

- appointmentTime (String, required): The time of the appointment.

- symptoms (String, required): Symptoms reported by the patient that led to this prescription.

- medicines (Array of objects, required): List of medicines prescribed. Each medicine object contains medicineName, dosage (like '500mg'), frequency (like 'twice daily'), duration (like '7 days'), and instructions (optional special notes).

- additionalNotes (String, optional): Any extra medical notes from the doctor.

- appointmentId (ObjectId reference to Appointment, required): Links to the appointment this prescription came from.

- doctorId (ObjectId reference to Doctor, required): The doctor who wrote this prescription.

- patientId (ObjectId reference to Patient, required): The patient who received this prescription.

How Prescription interacts with other entities:

- A prescription is created after an appointment is completed
- It references the specific appointment, doctor, and patient
- The medicines listed may or may not be available for ordering on the platform
- Patient can view their prescriptions in their profile

---

## Medicine Schema

The Medicine schema stores information about drugs and medicines available on the platform.

Fields in Medicine schema:

- name (String, required): Name of the medicine like 'Aspirin' or 'Paracetamol'.

- medicineID (String, required, unique): Unique identifier for this medicine. No two medicines have the same ID.

- quantity (Number, required, min 0): Current stock quantity available. Cannot be negative.

- cost (Number, required, min 0): Price per unit in rupees. Cannot be negative.

- manufacturer (String, required): Name of the pharmaceutical company that makes it.

- expiryDate (Date, required): Date when the medicine expires. Important for patient safety.

- image (String, optional): URL to a picture of the medicine. Can be null if not provided.

- supplierId (ObjectId reference to Supplier, required): Which supplier provides this medicine. Every medicine must have a supplier.

How Medicine interacts with other entities:

- A medicine is supplied by exactly one supplier
- Patients can add medicines to their cart for ordering
- Medicines appear in orders placed by patients
- The cost field is used to calculate order totals
- The quantity field decreases as orders are placed
- The expiryDate helps track which medicines are still valid

---

## Order Schema

The Order schema tracks medicine orders placed by patients.

Fields in Order schema:

- medicineId (ObjectId reference to Medicine, required): Which medicine is being ordered.

- patientId (ObjectId reference to Patient, required): Which patient is placing the order.

- supplierId (ObjectId reference to Supplier, required): Which supplier will fulfill this order.

- quantity (Number, required, min 1): How many units ordered. Must be at least 1.

- totalCost (Number, optional): Cost of the medicine before adding delivery charge.

- status (String, enum, default: 'pending'): Current status of the order. Can be 'pending' (just placed), 'confirmed' (supplier confirmed), 'shipped' (on the way), 'delivered' (received by patient), or 'cancelled'.

- deliveryAddress (addressSchema subdocument, optional): Where to deliver the medicine. Contains street, city, state, zip, country fields. Patient can choose from saved addresses or enter new one.

- paymentMethod (String, enum, default: 'cod'): How patient will pay. Can be 'cod' (cash on delivery), 'card' (credit/debit card), or 'upi'.

- deliveryCharge (Number, default: 10): Additional fee for shipping in rupees.

- finalAmount (Number, optional): Final total amount = totalCost + deliveryCharge. This is what patient actually pays.

How Order interacts with other entities:

- An order connects a patient, a specific medicine, and a supplier
- Patient initiates order by checking out from cart
- Supplier receives the order and updates status
- The deliveryAddress can be stored as subdocument (no separate collection)
- Order tracks full transaction including cost breakdown

---

## Cart Schema

The Cart schema stores temporary shopping cart for patients before they checkout.

Fields in Cart schema:

- patientId (ObjectId reference to Patient, required, unique): Which patient owns this cart. Each patient has exactly one cart.

- items (Array of cartItemSchema subdocuments, optional): List of medicines in the cart. Can be empty initially.

Each cartItemSchema subdocument inside items array contains:

- medicineId (ObjectId reference to Medicine, required): The medicine in cart.

- quantity (Number, required, min 1): How many units of this medicine. Must be at least 1.

How Cart interacts with other entities:

- A cart belongs to exactly one patient
- Each patient can have only one cart (unique constraint on patientId)
- Medicines are added to cart from the medicines list
- Cart items are subdocuments, not separate records
- When patient checks out, cart items become an order
- Cart is cleared after successful order placement

---

## Review Schema

The Review schema stores reviews and ratings written by patients and doctors about each other.

Fields in Review schema:

- userId (ObjectId, required): ID of the person writing the review. Can be a patient or doctor ID. Uses polymorphic reference via refPath.

- userType (String, enum, required): Either 'Patient' or 'Doctor'. Tells us which model to look up for the userId.

- userName (String, required): Name of the person who wrote the review.

- rating (Number, required, range 1-5): Star rating from 1 to 5 stars. Must be a whole number in this range.

- reviewText (String, required, min 10 chars max 1000 chars): The actual review content. Must have at least 10 characters and at most 1000 characters.

- isApproved (Boolean, default: false): Initially false. Employee or admin must approve before it's published.

- createdAt (Timestamp): When the review was submitted.

How Review interacts with other entities:

- A patient can review a doctor after appointment
- A doctor can review a patient
- Reviews use polymorphic reference, so userId can reference either Patient or Doctor model
- The userType field determines which model to use when populating userId
- Employee monitors all reviews and decides whether to approve them
- Admin also has access to monitor and manage reviews
- Reviews help other users decide whether to book with a doctor

---

## Blog Schema

The Blog schema stores blog posts and health articles posted on the platform.

Fields in Blog schema:

- title (String, required): The headline of the blog post.

- theme (String, required): Category or topic of the blog like 'Health Tips', 'Disease Information', etc.

- content (String, required): The main text content of the blog article.

- authorName (String, required): Name of the person who wrote it.

- authorEmail (String, required): Email address of the author for contact.

- authorType (String, enum, default: 'user'): Type of author. Can be 'user' (patient), 'doctor', or 'employee'. Helps identify who wrote it.

- images (Array of strings, optional): Array of URLs pointing to images included in the blog.

- createdAt (Timestamp): When the blog was posted.

How Blog interacts with other entities:

- A patient can write blogs as a 'user'
- A doctor can write blogs with 'doctor' type
- An employee can write blogs with 'employee' type
- Blogs are searchable by theme
- Blogs can contain multiple images
- Different user types provide different credibility levels for the content

---

## Chat Schema

The Chat schema stores messages exchanged between doctors and patients during appointments.

Fields in Chat schema:

- appointmentId (ObjectId reference to Appointment, required): Which appointment this chat belongs to. Links messages to a specific consultation.

- senderId (ObjectId, required): ID of the person sending the message. Can be patient or doctor.

- senderType (String, enum, required): Either 'patient' or 'doctor'. Identifies who sent the message.

- message (String, required): The actual text message content.

- filePath (String, optional): If a file is attached, this is the path to it on the server.

- fileName (String, optional): Original filename of the attachment.

- fileType (String, optional): MIME type like 'image/png' or 'application/pdf'.

- isFile (Boolean, default: false): Flag indicating whether this message includes a file attachment.

- timestamp (Date, default: now): When the message was sent.

How Chat interacts with other entities:

- Chat is linked to a specific appointment between a patient and doctor
- Doctor and patient can exchange text messages within appointment context
- Files can be shared like reports or test results
- Chat is organized by appointment, not as a general messaging system
- Messages are timestamped to show order of conversation

---

## Relationships and How Fields Connect

Patient to Appointment relationship:

A patient uses their patientId (from Patient schema) which gets stored in the patientId field of Appointment. This creates a one-to-many relationship where one patient can have many appointments. When we need to get all appointments for a patient, we query appointments where patientId matches that patient's ID.

Doctor to Appointment relationship:

A doctor's doctorId is stored in the doctorId field of appointments. This allows one doctor to manage many appointments. When doctor logs in, they can see all appointments where doctorId is their ID.

Appointment to Prescription relationship:

After an appointment is completed, a prescription is created. The prescription stores appointmentId, doctorId, and patientId to link back to the original appointment. This ensures we know which appointment created this prescription.

Patient to Order relationship:

When patient orders medicine, their patientId is stored in the Order. This tracks which patient placed which order. Patient can view all their orders.

Supplier to Medicine relationship:

Every medicine record has a supplierId that references which supplier provides it. One supplier can provide many medicines. This tracks who supplies what.

Medicine to Order relationship:

When patient orders, the medicineId is stored in the Order. This tracks which medicine was ordered.

Supplier to Order relationship:

The supplierId in Order shows which supplier fulfills that order. One supplier can fulfill orders for the same medicine from different patients.

Patient to Cart relationship:

Each patient has one cart (unique patientId in Cart). The patientId in Cart points to the patient who owns it.

Cart to Medicine relationship:

Cart items contain medicineId references. This points to the medicines available for purchase.

Doctor to Prescription relationship:

The doctorId in Prescription points to which doctor wrote it. A doctor can write many prescriptions.

Patient to Chat relationship:

When senderId is a patient in Chat, that patient's ID is there. Patient messages in a specific appointment.

Doctor to Chat relationship:

When senderId is a doctor in Chat, that doctor's ID is there. Doctor replies to patient messages.

Appointment to Chat relationship:

All chat messages for a conversation are linked via appointmentId. All messages in one appointment thread have the same appointmentId.

Employee approval of Doctor:

An employee reviews a doctor's documentPath and sets isApproved to true or isRejected to true with rejectionReason. This one-time action activates or rejects the doctor.

Employee approval of Supplier:

Similar to doctor approval. Employee sets approvalStatus to 'approved' or 'rejected' with rejectionReason for suppliers.

Admin approval of Employee:

Admin reviews employee and sets isApproved to true or rejects with approvalStatus and rejectionReason.

Review by Patient or Doctor:

Review uses polymorphic reference. The userId can point to either a Patient document or Doctor document. The userType field tells the system which one. A patient reviewing a doctor has userId pointing to a patient's ID and userType as 'Patient'.

---

## Data Workflow Examples

Appointment booking workflow:

1. Patient selects a doctor from the doctor list
2. Patient chooses a date and time
3. Patient selects online or offline appointment type
4. A new Appointment record is created with status 'pending', patientId, doctorId, date, time, type, and consultationFee
5. Patient makes payment, status changes to 'confirmed'
6. At appointment time, doctor joins and consultation happens
7. Doctor can add doctorNotes during or after consultation
8. Patient leaves feedback and rating
9. Status changes to 'completed'

Medicine ordering workflow:

1. Patient browses the medicines list
2. Patient finds a medicine and checks its name, cost, quantity, manufacturer, expiry date
3. Patient adds medicine to cart (creates entry in Cart with patientId and items array)
4. Patient can add more medicines to same cart
5. Patient goes to checkout
6. Patient enters or selects delivery address
7. System calculates totalCost (sum of medicine costs) and adds deliveryCharge (usually 10)
8. finalAmount = totalCost + deliveryCharge
9. Patient selects payment method
10. Order is created with all details
11. Supplier sees the order and updates status from 'pending' to 'confirmed'
12. Supplier ships the medicine, updates status to 'shipped'
13. Courier delivers, supplier updates to 'delivered'

Doctor verification workflow:

1. Doctor signs up and uploads medical registration documents (stored as documentPath)
2. Document gets reviewed by an employee
3. Employee checks registrationNumber validity and documentPath
4. If valid, employee sets isApproved to true
5. If invalid, employee sets isRejected to true and adds rejectionReason
6. Doctor receives notification
7. Approved doctor can now accept appointments
8. Rejected doctor can re-upload documents for another approval attempt

Prescription creation workflow:

1. After appointment is completed
2. Doctor creates prescription with patient details (patientName, patientEmail, age, gender, weight)
3. Doctor records appointmentDate, appointmentTime from the original appointment
4. Doctor lists symptoms reported by patient
5. Doctor adds medicines array with medicineName, dosage, frequency, duration for each prescribed medicine
6. Prescription is saved with appointmentId, doctorId, patientId linking to the original appointment
7. Patient can view prescription
8. Patient can potentially order medicines from the prescribed list if available

Chat during appointment workflow:

1. When appointment status is 'confirmed' or 'completed'
2. Patient and doctor can message each other
3. Each message creates a Chat record with appointmentId, senderId, senderType, message text
4. Files can be shared by setting isFile to true and providing filePath, fileName, fileType
5. All messages are timestamped in order
6. Chat history is viewed by both patient and doctor within that appointment

---

## Key Validation Rules and Constraints

Patient email must be unique - no duplicate patient emails allowed.

Doctor registrationNumber must be unique - validates medical credentials.

Doctor consultationFee cannot be negative - must be 0 or more.

Supplier supplierID must be unique - identifier for each supplier.

Cart patientId must be unique - one cart per patient only.

Order quantity must be at least 1 - cannot order 0 items.

Appointment patientId is not required only for blocked slots - normal appointments need patient.

Appointment type is not required only for blocked slots - blocked slots don't need consultation type.

Review rating must be 1 to 5 - valid star rating range.

Review text must be between 10 and 1000 characters - ensures quality reviews.

Medicine quantity cannot be negative - stock cannot go below zero.

Medicine cost cannot be negative - prices must be valid.

Delivery address in Order contains subdocument with street, city, state, zip, country - complete address needed for delivery.

---

## Summary

The MEDIQUICK database has 13 interconnected schemas. Five handle user management (Patient, Doctor, Supplier, Employee, Admin). Two handle medical consultations (Appointment, Prescription). Three handle medicine commerce (Medicine, Order, Cart). Two handle community features (Review, Blog). One handles real-time communication (Chat).

Fields are connected through ObjectId references that point from one document to another. Subdocuments like addressSchema are embedded directly within parent documents. Timestamps track when records are created and modified. Enums restrict fields to specific allowed values. Unique constraints prevent duplicates. Required constraints ensure important data is always present.

The system uses a polymorphic reference in Review where userId can point to either Patient or Doctor based on the userType field value. Cart items are embedded as subdocuments rather than separate documents to keep shopping carts simple and fast.

All relationships follow a pattern where the child document stores the ID of the parent document it references. This allows the system to join data across collections using populate queries.

---

Document Version: 1.0
Last Updated: March 4, 2026
Status: Ready for Submission

### 1. Patient Schema

**Purpose:** Stores information about patients who use the telemedicine platform.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| name | String | ✅ | ❌ | - | Patient's full name |
| email | String | ✅ | ✅ | - | Email address (unique identifier) |
| mobile | String | ✅ | ❌ | - | 10-digit mobile number |
| address | String | ✅ | ❌ | - | Primary address |
| password | String | ✅ | ❌ | - | Hashed password |
| dateOfBirth | Date | ❌ | ❌ | - | Date of birth for age calculation |
| gender | String (enum) | ❌ | ❌ | - | 'male', 'female', 'other' |
| addresses | Array (addressSchema) | ❌ | ❌ | [] | Multiple saved addresses |
| profilePhoto | String | ❌ | ❌ | '/images/default-patient.svg' | Profile picture URL |
| createdAt | Date | Auto | ❌ | Date.now | Timestamp of creation |
| updatedAt | Date | Auto | ❌ | Date.now | Timestamp of last update |

**addressSchema (Subdocument):**
- label: String (e.g., "Home", "Work")
- street, city, state, zip, country: String
- isDefault: Boolean (marks primary address)

**Usage:** Patients book appointments, order medicines, write reviews, post blogs, and chat with doctors.

---

### 2. Doctor Schema

**Purpose:** Stores information about licensed doctors and healthcare professionals.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| name | String | ✅ | ❌ | - | Doctor's full name |
| email | String | ✅ | ✅ | - | Email address (unique identifier) |
| mobile | String | ✅ | ❌ | - | Contact number |
| address | String | ✅ | ❌ | - | Clinic/office address |
| registrationNumber | String | ✅ | ✅ | - | Medical registration number (unique) |
| specialization | String | ❌ | ❌ | - | Medical specialization (e.g., Cardiology) |
| college | String | ✅ | ❌ | - | Medical college/university |
| yearOfPassing | String | ✅ | ❌ | - | Year of medical degree completion |
| location | String | ✅ | ❌ | - | Service location/city |
| onlineStatus | String (enum) | ✅ | ❌ | 'offline' | 'online' or 'offline' |
| consultationFee | Number | ✅ | ❌ | 100 | Fee per consultation (₹) |
| dateOfBirth | Date | ❌ | ❌ | - | Doctor's date of birth |
| gender | String (enum) | ❌ | ❌ | - | 'male', 'female', 'other' |
| password | String | ✅ | ❌ | - | Hashed password |
| documentPath | String | ❌ | ❌ | - | Path to uploaded registration documents |
| profilePhoto | String | ❌ | ❌ | '/images/default-doctor.svg' | Profile picture URL |
| isApproved | Boolean | ❌ | ❌ | false | Employee approval status |
| isRejected | Boolean | ❌ | ❌ | false | Rejection status |
| rejectionReason | String | ❌ | ❌ | - | Reason for rejection (if applicable) |
| securityCode | String | ❌ | ❌ | - | 2FA security code |
| ssn | String | ❌ | ❌ | null | Social security number (optional) |
| lastLogin | Date | ❌ | ❌ | - | Last login timestamp |
| createdAt | Date | Auto | ❌ | Date.now | Registration timestamp |
| updatedAt | Date | Auto | ❌ | Date.now | Last profile update |

**Workflow:** 
1. Doctor signs up and uploads documents
2. Employee approves/rejects the doctor
3. Once approved, doctor can manage appointments and create prescriptions
4. Doctor can toggle online/offline status

---

### 3. Supplier Schema

**Purpose:** Stores information about medicine suppliers.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| name | String | ✅ | ❌ | - | Supplier's company name |
| email | String | ✅ | ✅ | - | Email address |
| mobile | String | ✅ | ❌ | - | Contact number |
| address | String | ✅ | ❌ | - | Supplier's address |
| supplierID | String | ✅ | ✅ | - | Unique supplier identifier |
| password | String | ✅ | ❌ | - | Hashed password |
| profilePhoto | String | ❌ | ❌ | '/images/default-supplier.svg' | Company logo/photo |
| documentPath | String | ❌ | ❌ | - | Path to business registration documents |
| isApproved | Boolean | ❌ | ❌ | false | Employee approval status |
| isRejected | Boolean | ❌ | ❌ | false | Rejection status |
| approvalStatus | String (enum) | ❌ | ❌ | 'pending' | 'pending', 'approved', 'rejected' |
| rejectionReason | String | ❌ | ❌ | - | Reason for rejection |
| lastLogin | Date | ❌ | ❌ | - | Last login timestamp |
| createdAt | Date | Auto | ❌ | Date.now | Registration timestamp |
| updatedAt | Date | Auto | ❌ | Date.now | Last update |

**Workflow:**
1. Supplier signs up with business documents
2. Employee verifies and approves
3. Supplier adds medicines to the platform
4. Supplier fulfills orders and updates order status

---

### 4. Employee Schema

**Purpose:** Stores information about system employees who verify doctors and suppliers.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| name | String | ✅ | ❌ | - | Employee's full name |
| email | String | ✅ | ✅ | - | Email address |
| mobile | String | ✅ | ❌ | - | Contact number |
| address | String | ✅ | ❌ | - | Home/office address |
| password | String | ✅ | ❌ | - | Hashed password |
| profilePhoto | String | ❌ | ❌ | '/images/default-employee.svg' | Profile picture URL |
| documentPath | String | ❌ | ❌ | - | Path to employment documents |
| isApproved | Boolean | ❌ | ❌ | false | Admin approval status |
| approvalStatus | String (enum) | ❌ | ❌ | 'pending' | 'pending', 'approved', 'rejected' |
| lastLogin | Date | ❌ | ❌ | - | Last login timestamp |
| createdAt | Date | Auto | ❌ | Date.now | Account creation |
| updatedAt | Date | Auto | ❌ | Date.now | Last update |

**Workflow:**
1. Employee is created by Admin
2. Employee can approve/reject Doctor applications
3. Employee can approve/reject Supplier applications
4. Employee monitors reviews for quality control

---

### 5. Admin Schema

**Purpose:** Stores information about system administrators.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| name | String | ✅ | ❌ | - | Admin's full name |
| email | String | ✅ | ✅ | - | Email address (unique) |
| mobile | String | ✅ | ❌ | - | Contact number |
| address | String | ✅ | ❌ | - | Address |
| password | String | ✅ | ❌ | - | Hashed password |
| lastLogin | Date | ❌ | ❌ | - | Last login timestamp |
| createdAt | Date | Auto | ❌ | Date.now | Account creation |
| updatedAt | Date | Auto | ❌ | Date.now | Last update |

**Permissions:**
- Monitor all reviews
- Search and manage user data
- View platform analytics
- Create/manage employee accounts

---

## Appointment & Prescription Schemas

### 6. Appointment Schema

**Purpose:** Manages consultation appointments between patients and doctors.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| patientId | ObjectId (ref: Patient) | Conditional | ❌ | - | Patient booking the appointment (not required for blocked slots) |
| doctorId | ObjectId (ref: Doctor) | ✅ | ❌ | - | Doctor providing consultation |
| date | Date | ✅ | ❌ | - | Appointment date |
| time | String | ✅ | ❌ | - | Appointment time (HH:MM format) |
| type | String (enum) | Conditional | ❌ | - | 'online' or 'offline' (not required for blocked slots) |
| status | String (enum) | ❌ | ❌ | 'pending' | 'pending', 'confirmed', 'completed', 'cancelled', 'blocked' |
| consultationFee | Number | Conditional | ❌ | - | Fee charged (not required for blocked slots) |
| modeOfPayment | String (enum) | ❌ | ❌ | null | 'credit-card', 'upi', 'net-banking', 'wallet', 'cash' |
| notes | String | ❌ | ❌ | - | Additional appointment notes |
| isBlockedSlot | Boolean | ❌ | ❌ | false | Whether this is a blocked time slot |
| doctorNotes | Object | ❌ | ❌ | - | Doctor's private notes with file attachments |
| feedback | String | ❌ | ❌ | null | Patient feedback after consultation |
| rating | Number (0-10) | ❌ | ❌ | null | Patient rating (if applicable) |
| reviewedAt | Date | ❌ | ❌ | null | Timestamp of review |
| createdAt | Date | Auto | ❌ | Date.now | Appointment creation |
| updatedAt | Date | Auto | ❌ | Date.now | Last update |

**Key Features:**
- Supports online and offline consultations
- Doctors can block time slots
- Includes feedback and rating system
- Doctor can add private notes with file attachments

**Relationship:**
- Links Patient (books) and Doctor (manages)
- Generates Prescription after consultation
- Connected to Chat for communication

---

### 7. Prescription Schema

**Purpose:** Stores medical prescriptions created after appointments.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| patientName | String | ✅ | ❌ | - | Patient's name |
| patientEmail | String | ✅ | ❌ | - | Patient's email |
| doctorEmail | String | ✅ | ❌ | - | Doctor's email |
| age | Number | ✅ | ❌ | - | Patient's age |
| gender | String (enum) | ✅ | ❌ | - | 'male', 'female', 'other' |
| weight | Number | ✅ | ❌ | - | Patient's weight (kg) |
| appointmentDate | Date | ✅ | ❌ | - | Associated appointment date |
| appointmentTime | String | ✅ | ❌ | - | Appointment time |
| symptoms | String | ✅ | ❌ | - | Symptoms reported by patient |
| medicines | Array | ✅ | ❌ | [] | List of prescribed medicines |
| additionalNotes | String | ❌ | ❌ | - | Additional medical notes |
| appointmentId | ObjectId (ref: Appointment) | ✅ | ❌ | - | Associated appointment |
| doctorId | ObjectId (ref: Doctor) | ✅ | ❌ | - | Prescribing doctor |
| patientId | ObjectId (ref: Patient) | ✅ | ❌ | - | Patient receiving prescription |
| createdAt | Date | Auto | ❌ | Date.now | Prescription creation |
| updatedAt | Date | Auto | ❌ | Date.now | Last update |

**medicines Array (Subdocument):**
```
[
  {
    medicineName: String (required),
    dosage: String (required),     // e.g., "500mg"
    frequency: String (required),  // e.g., "Twice daily"
    duration: String (required),   // e.g., "7 days"
    instructions: String           // Optional special instructions
  }
]
```

**Relationship:**
- Generated after Appointment completion
- Links Doctor, Patient, and Appointment
- Medicines listed may or may not be available on the platform

---

## Medicine & Order Schemas

### 8. Medicine Schema

**Purpose:** Stores information about medicines available on the platform.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| name | String | ✅ | ❌ | - | Medicine name (e.g., "Aspirin") |
| medicineID | String | ✅ | ✅ | - | Unique medicine identifier |
| quantity | Number | ✅ | ❌ | - | Current stock quantity (min: 0) |
| cost | Number | ✅ | ❌ | - | Price per unit (₹, min: 0) |
| manufacturer | String | ✅ | ❌ | - | Manufacturer name |
| expiryDate | Date | ✅ | ❌ | - | Medicine expiry date |
| image | String | ❌ | ❌ | null | Product image URL |
| supplierId | ObjectId (ref: Supplier) | ✅ | ❌ | - | Supplier providing the medicine |
| createdAt | Date | Auto | ❌ | Date.now | Added to platform |
| updatedAt | Date | Auto | ❌ | Date.now | Last stock/price update |

**Relationship:**
- Supplied by exactly one Supplier
- Can be added to Cart by multiple Patients
- Can be ordered through Order schema

---

### 9. Order Schema

**Purpose:** Manages medicine orders placed by patients.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| medicineId | ObjectId (ref: Medicine) | ✅ | ❌ | - | Medicine being ordered |
| patientId | ObjectId (ref: Patient) | ✅ | ❌ | - | Patient placing the order |
| supplierId | ObjectId (ref: Supplier) | ✅ | ❌ | - | Supplier fulfilling order |
| quantity | Number | ✅ | ❌ | - | Quantity ordered (min: 1) |
| totalCost | Number | ❌ | ❌ | - | Cost before delivery charge |
| status | String (enum) | ❌ | ❌ | 'pending' | 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled' |
| deliveryAddress | addressSchema | ❌ | ❌ | - | Delivery address (street, city, state, zip, country) |
| paymentMethod | String (enum) | ❌ | ❌ | 'cod' | 'cod', 'card', 'upi' |
| deliveryCharge | Number | ❌ | ❌ | 10 | Shipping/delivery fee (₹) |
| finalAmount | Number | ❌ | ❌ | - | Total amount (totalCost + deliveryCharge) |
| createdAt | Date | Auto | ❌ | Date.now | Order creation |
| updatedAt | Date | Auto | ❌ | Date.now | Last status update |

**Workflow:**
1. Patient browses medicines
2. Patient adds to cart or directly orders
3. Patient provides delivery address and payment method
4. Supplier confirms and ships order
5. Supplier updates delivery status

**Relationship:**
- Links Patient, Medicine, and Supplier
- Medicine details pulled from Medicine schema at order time

---

## Cart Schema

### 10. Cart Schema

**Purpose:** Temporary storage for medicines before checkout.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| patientId | ObjectId (ref: Patient) | ✅ | ✅ | - | Owner of the cart (one cart per patient) |
| items | Array (cartItemSchema) | ❌ | ❌ | [] | List of medicines in cart |
| createdAt | Date | Auto | ❌ | Date.now | Cart creation |
| updatedAt | Date | Auto | ❌ | Date.now | Last modification |

**cartItemSchema (Subdocument):**

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| medicineId | ObjectId (ref: Medicine) | ✅ | - | Medicine in cart |
| quantity | Number | ✅ | - | Quantity added (min: 1) |

**Example Cart Document:**
```json
{
  "patientId": "60f7b3c1d4e5a2b3c4d5e6f7",
  "items": [
    { "medicineId": "60f7b3c1d4e5a2b3c4d5e6f8", "quantity": 2 },
    { "medicineId": "60f7b3c1d4e5a2b3c4d5e6f9", "quantity": 1 }
  ]
}
```

**Workflow:**
1. Patient adds medicines to cart
2. Patient reviews cart
3. Patient proceeds to checkout (creates Order)
4. Cart is cleared after successful order

---

## Review & Blog Schemas

### 11. Review Schema

**Purpose:** Stores reviews and ratings about doctors and patients.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| userId | ObjectId | ✅ | ❌ | - | ID of reviewer (Patient or Doctor) |
| userType | String (enum) | ✅ | ❌ | - | 'Patient' or 'Doctor' (determines userId ref) |
| userName | String | ✅ | ❌ | - | Name of reviewer |
| rating | Number (1-5) | ✅ | ❌ | - | Star rating (1 to 5) |
| reviewText | String | ✅ | ❌ | - | Review content (10-1000 characters) |
| isApproved | Boolean | ❌ | ❌ | false | Admin/Employee approval status |
| createdAt | Date | Auto | ❌ | Date.now | Review submission time |

**Key Features:**
- Polymorphic reference using `refPath` (userId can reference Patient or Doctor)
- Indexed by `isApproved` and `createdAt` for fast queries
- Employee/Admin approval workflow

**Relationship:**
- Can be written by Patient or Doctor
- Monitored by Employee and Admin

---

### 12. Blog Schema

**Purpose:** Stores blog posts and health articles.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| title | String | ✅ | ❌ | - | Blog post title |
| theme | String | ✅ | ❌ | - | Category/theme of blog |
| content | String | ✅ | ❌ | - | Main blog content |
| authorName | String | ✅ | ❌ | - | Author's name |
| authorEmail | String | ✅ | ❌ | - | Author's email |
| authorType | String (enum) | ❌ | ❌ | 'user' | 'user', 'doctor', 'employee' |
| images | Array | ❌ | ❌ | [] | Array of image URLs |
| createdAt | Date | Auto | ❌ | Date.now | Publication time |

**Workflow:**
1. Patient, Doctor, or Employee writes blog
2. Blog published immediately or after approval (based on author type)
3. Searchable by theme and author

---

## Chat Schema

### 13. Chat Schema

**Purpose:** Stores real-time chat messages between doctors and patients.

**Attributes:**

| Attribute | Type | Required | Unique | Default | Description |
|-----------|------|----------|--------|---------|-------------|
| appointmentId | ObjectId (ref: Appointment) | ✅ | ❌ | - | Associated appointment |
| senderId | ObjectId | ✅ | ❌ | - | ID of message sender (Patient or Doctor) |
| senderType | String (enum) | ✅ | ❌ | - | 'patient' or 'doctor' |
| message | String | ✅ | ❌ | - | Chat message text |
| filePath | String | ❌ | ❌ | - | Path to attached file (if any) |
| fileName | String | ❌ | ❌ | - | Original filename |
| fileType | String | ❌ | ❌ | - | MIME type (e.g., 'image/png') |
| isFile | Boolean | ❌ | ❌ | false | Flag indicating if message includes file |
| timestamp | Date | ❌ | ❌ | Date.now | Message sent time |

**Key Features:**
- Linked to specific Appointment
- Supports text and file sharing
- Chronologically ordered by timestamp

**Workflow:**
1. Patient and Doctor allowed to chat within appointment context
2. Can share text messages and files
3. Chat history displayed in appointment details

---

## Relationships & Entity Connections

### Overview Diagram

```
┌─────────┐          ┌─────────┐          ┌──────────┐
│ Patient │<-------→│  Doctor │←─────────→│ Supplier │
└────┬────┘          └────┬────┘          └────┬─────┘
     │                    │                     │
     │ books              │ creates             │ supplies
     │                    │                     │
     ↓                    ↓                     ↓
 ┌─────────────────┐  ┌────────────┐      ┌──────────┐
 │  Appointment    │→→│Prescription│      │ Medicine │
 └────────┬────────┘  └────────────┘      └────┬─────┘
          │                                     │
          │ contains                      added_to/ordered
          ↓                                     ↓
     ┌────────┐          ┌────────┐      ┌─────────┐
     │  Chat  │          │ Cart   │←─────│ Order   │
     └────────┘          └────────┘      └─────────┘
          
     ┌─────────┐
     │ Review  │ (by Patient/Doctor, monitored by Employee/Admin)
     └─────────┘
     
     ┌─────────┐
     │  Blog   │ (by Patient/Doctor/Employee)
     └─────────┘
     
     ┌──────────┐
     │ Employee │ (approves Doctor, Supplier)
     └─────┬────┘
           │
     ┌─────↓─────┐
     │   Admin    │ (top-level admin)
     └────────────┘
```

### Detailed Relationships

#### 1. **Patient-Doctor Appointment Flow**
```
Patient → Books → Appointment ← Manages ← Doctor
              ↓
          (confirmed/completed)
              ↓
         Prescription
              ↓
         Chat Messages
              ↓
         Review & Rating
```

#### 2. **Medicine Supply Chain**
```
Supplier → Supplies → Medicine
                         ↓
                    (Patient adds to)
                         ↓
                       Cart
                         ↓
                    (Checkout)
                         ↓
                      Order ← Fulfilled by → Supplier
```

#### 3. **Verification Workflow**
```
Doctor (signup) ─→ [pending] ─→ Employee Review ─→ [approved/rejected]
Supplier (signup) → [pending] → Employee Review → [approved/rejected]
Employee (created) → [pending] → Admin Review → [approved/rejected]
```

#### 4. **User Roles & Permissions**

| Role | Can Create | Can Manage | Can Approve |
|------|-----------|-----------|------------|
| **Patient** | Appointments, Orders, Reviews, Blogs, Chat | Appointments, Cart, Orders | None |
| **Doctor** | Prescriptions, Reviews, Blogs, Chat | Appointments, Prescriptions | None |
| **Supplier** | Medicines | Medicines, Orders | None |
| **Employee** | Reviews | System Data | Doctor, Supplier |
| **Admin** | Employees | All Data | Employees, Reviews |

---

### Key Reference Patterns

#### ObjectId References
- **Direct Reference** (ref: 'ModelName'): Used when one document always references another
  - Example: `appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }`

- **Polymorphic Reference** (refPath): Used when field can reference multiple models
  - Example: `userId` in Review can reference Patient OR Doctor
  - `refPath: 'userType'` determines which model to populate

#### Subdocuments
- **addressSchema**: Embedded in Patient and Order (no separate collection)
- **cartItemSchema**: Embedded in Cart
- **doctorNotes**: Embedded in Appointment
- **medicines array**: Embedded in Prescription

---

### Data Flow Examples

#### Appointment Booking Flow
```
1. Patient browses doctors (Doctor list)
2. Patient selects doctor and date (creates Appointment)
3. Appointment status: pending → confirmed → completed
4. Doctor creates Prescription
5. Patient leaves Review
6. Chat messages stored during consultation
```

#### Medicine Ordering Flow
```
1. Patient searches medicines (from Medicine schema)
2. Patient adds medicine to Cart
3. Patient reviews cart items
4. Patient proceeds to checkout (creates Order)
5. Order references Medicine, Patient, and Supplier
6. Supplier updates order status
7. Order delivered
```

#### Verification Flow
```
1. New Doctor signs up (documentPath uploaded)
2. Employee reviews documents
3. Employee approves → Doctor.isApproved = true
4. Doctor can now accept appointments
5. Similarly for Supplier verification
```

---

### Constraints & Validations

| Schema | Constraint | Purpose |
|--------|-----------|---------|
| Patient | email: unique | Prevent duplicate accounts |
| Doctor | registrationNumber: unique | Validate medical credentials |
| Doctor | consultationFee: min 0 | Prevent negative fees |
| Supplier | supplierID: unique | Unique supplier identifier |
| Appointment | patientId: conditional | Not required for blocked slots |
| Cart | patientId: unique | One cart per patient |
| Order | quantity: min 1 | At least 1 medicine ordered |
| Review | rating: 1-5 | Valid star rating |
| Review | reviewText: 10-1000 chars | Quality content validation |
| Prescription | medicines: required | At least one medicine |
| Medicine | expiryDate: required | Track medicine validity |

---

### Indexing Strategy

**MongoDB Indexes for Performance:**

```javascript
// Review indexes
reviewSchema.index({ isApproved: 1, createdAt: -1 });  // For approval workflow
reviewSchema.index({ userType: 1 });                    // For filtering reviews

// Other implicit indexes
Patient.email (unique)
Doctor.email (unique), Doctor.registrationNumber (unique)
Supplier.email (unique), Supplier.supplierID (unique)
Order.medicineId, Order.patientId, Order.supplierId
Appointment.doctorId, Appointment.patientId
```

---

## Summary

MEDIQUICK's database architecture is built on 13 interconnected MongoDB Mongoose schemas:

- **5 User Schemas**: Patient, Doctor, Supplier, Employee, Admin
- **2 Appointment/Medical Schemas**: Appointment, Prescription
- **2 Medicine Commerce Schemas**: Medicine, Order, Cart
- **2 Community Schemas**: Review, Blog
- **1 Communication Schema**: Chat

Each schema is designed with specific purposes, proper indexing, and comprehensive relationships to support the complete telemedicine platform workflow.

---

**Document Version:** 1.0  
**Last Updated:** March 4, 2026  
**Status:** Ready for Submission ✅
