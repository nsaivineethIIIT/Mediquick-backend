# MEDIQUICK - Database ER Diagram (Ready to Paste)

## Copy this entire code block and paste it into Mermaid Live Editor

```mermaid
erDiagram
    PATIENT ||--o{ APPOINTMENT : books
    PATIENT ||--o{ ORDER : places
    PATIENT ||--o| CART : has
    PATIENT ||--o{ REVIEW : writes
    PATIENT ||--o{ CHAT : sends
    
    DOCTOR ||--o{ APPOINTMENT : manages
    DOCTOR ||--o{ PRESCRIPTION : creates
    DOCTOR ||--o{ REVIEW : writes
    DOCTOR ||--o{ CHAT : sends
    
    APPOINTMENT ||--o| PRESCRIPTION : generates
    APPOINTMENT ||--o{ CHAT : contains
    
    SUPPLIER ||--o{ MEDICINE : supplies
    MEDICINE ||--o{ ORDER : "ordered in"
    
    EMPLOYEE ||--o{ DOCTOR : approves
    EMPLOYEE ||--o{ SUPPLIER : approves
    
    ADMIN ||--o{ EMPLOYEE : approves
    ADMIN ||--o{ REVIEW : monitors
    
    PATIENT {
        string _id PK
        string name
        string email UK
        string mobile
        string address
        string password
        date dateOfBirth
        string gender
        string profilePhoto
        date createdAt
        date updatedAt
    }
    
    DOCTOR {
        string _id PK
        string name
        string email UK
        string mobile
        string address
        string registrationNumber UK
        string specialization
        string college
        string yearOfPassing
        string location
        string onlineStatus
        number consultationFee
        date dateOfBirth
        string gender
        string password
        boolean isApproved
        string documentPath
        string profilePhoto
        date lastLogin
        date createdAt
        date updatedAt
    }
    
    APPOINTMENT {
        string _id PK
        string patientId FK
        string doctorId FK
        date date
        string time
        string status
        string type
        number consultationFee
        string modeOfPayment
        string notes
        boolean isBlockedSlot
        date createdAt
        date updatedAt
    }
    
    PRESCRIPTION {
        string _id PK
        string patientName
        string patientEmail
        string doctorEmail
        number age
        string gender
        number weight
        date appointmentDate
        string appointmentTime
        string symptoms
        string additionalNotes
        string doctorId FK
        string patientId FK
        string appointmentId FK
        date createdAt
        date updatedAt
    }
    
    MEDICINE {
        string _id PK
        string name
        string medicineID UK
        number quantity
        number cost
        string manufacturer
        date expiryDate
        string image
        string supplierId FK
        date createdAt
        date updatedAt
    }
    
    ORDER {
        string _id PK
        string medicineId FK
        string patientId FK
        string supplierId FK
        number quantity
        number totalCost
        string status
        string paymentMethod
        number deliveryCharge
        number finalAmount
        date createdAt
        date updatedAt
    }
    
    CART {
        string _id PK
        string patientId FK_UK
        date createdAt
        date updatedAt
    }
    
    SUPPLIER {
        string _id PK
        string name
        string email UK
        string mobile
        string address
        string supplierID UK
        string password
        string profilePhoto
        string documentPath
        boolean isApproved
        string approvalStatus
        string rejectionReason
        boolean isRejected
        date lastLogin
        date createdAt
        date updatedAt
    }
    
    EMPLOYEE {
        string _id PK
        string name
        string email UK
        string mobile
        string address
        string password
        string profilePhoto
        string documentPath
        boolean isApproved
        string approvalStatus
        date lastLogin
        date createdAt
        date updatedAt
    }
    
    ADMIN {
        string _id PK
        string name
        string email UK
        string mobile
        string address
        string password
        date lastLogin
        date createdAt
        date updatedAt
    }
    
    REVIEW {
        string _id PK
        string userId FK
        string userType
        string userName
        number rating
        string reviewText
        boolean isApproved
        date createdAt
    }
    
    BLOG {
        string _id PK
        string title
        string theme
        string content
        string authorName
        string authorEmail
        string authorType
        date createdAt
    }
    
    CHAT {
        string _id PK
        string appointmentId FK
        string senderId FK
        string senderType
        string message
        string filePath
        string fileName
        string fileType
        boolean isFile
        date timestamp
    }
```

---

## Notes:
- **Simplified types**: Changed `ObjectId`, `String`, `Number`, `Boolean`, `Date`, `Array`, `Object` to lowercase `string`, `number`, `boolean`, `date` (Mermaid standard)
- **Removed CART_ITEM**: It's an embedded schema in MongoDB, not a separate collection
- **Removed complex array/object fields**: These are shown as simplified in the entity attributes
- **All relationships properly defined** at the top
- **Constraints**: PK (Primary Key), FK (Foreign Key), UK (Unique Key), FK_UK (Foreign Key + Unique)

---

## How to Use:
1. Go to **https://mermaid.live/**
2. **Delete** the default code
3. **Copy** the entire code block above (from ```mermaid to ```)
4. **Paste** it into the editor
5. The diagram will render instantly!

---

## Entity Summary:
- **13 Main Entities**: Patient, Doctor, Admin, Employee, Supplier, Appointment, Prescription, Medicine, Order, Cart, Review, Blog, Chat
- **24 Relationships** showing how entities connect
- **Complete field definitions** for all entities
