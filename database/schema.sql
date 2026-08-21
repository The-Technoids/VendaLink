-- VendaLink Database Schema (MS SQL Server)
-- GKHack26 — Street Economy / Build for Use
--
-- Matches the architecture doc exactly: Vendors, Categories, Products, CustomerReviews.
-- Vendor location lives directly on Vendors (Latitude/Longitude/LocationDescription) —
-- there is no separate GeographicTags table.
--
-- Run this against a fresh database to create all tables and load demo seed data.

-- 1. Vendors
CREATE TABLE Vendors (
    VendorID INT IDENTITY(1,1) PRIMARY KEY,
    BusinessName NVARCHAR(100) NOT NULL,
    OwnerName NVARCHAR(100),
    PhoneNumber NVARCHAR(20) NOT NULL,
    Latitude DECIMAL(9, 6) NOT NULL,
    Longitude DECIMAL(9, 6) NOT NULL,
    LocationDescription NVARCHAR(255), -- e.g., "Outside Centurion Taxi Rank Gate 2"
    IsOpen BIT DEFAULT 1,
    PaymentTypes NVARCHAR(100) DEFAULT 'Cash, EFT, SnapScan',
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 2. Categories
CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(50) NOT NULL -- e.g., 'Fresh Produce', 'Hot Food', 'Clothing'
);

-- 3. Products / Stock
CREATE TABLE Products (
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    VendorID INT FOREIGN KEY REFERENCES Vendors(VendorID) ON DELETE CASCADE,
    CategoryID INT FOREIGN KEY REFERENCES Categories(CategoryID),
    ProductName NVARCHAR(100) NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    IsAvailable BIT DEFAULT 1,
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- 4. Customer Reviews & Verification
CREATE TABLE CustomerReviews (
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    VendorID INT FOREIGN KEY REFERENCES Vendors(VendorID) ON DELETE CASCADE,
    Rating INT CHECK (Rating BETWEEN 1 AND 5),
    Comment NVARCHAR(500),
    IsVerifiedVisit BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ---------------------------------------------------------------------------
-- Demo seed data — so the app isn't empty on first run / during judging
-- ---------------------------------------------------------------------------

INSERT INTO Categories (CategoryName) VALUES
('Fresh Produce'),
('Hot Food'),
('Clothing'),
('Electronics');

INSERT INTO Vendors (BusinessName, OwnerName, PhoneNumber, Latitude, Longitude, LocationDescription, IsOpen, PaymentTypes) VALUES
('Mama Thandi''s Kitchen', 'Thandiwe Nkosi', '0821234567', -25.860100, 28.189400, 'Outside Centurion Taxi Rank, Gate 2', 1, 'Cash, EFT, SnapScan'),
('Sipho''s Fresh Veg',      'Sipho Mokoena',  '0837654321', -25.859000, 28.190100, 'Corner of Heuwel & Bantom Street',    1, 'Cash, SnapScan'),
('Corner Threads',          'Lindiwe Dube',   '0845558899', -25.861500, 28.188800, 'Next to Centurion Mall taxi drop-off', 0, 'Cash, EFT');

INSERT INTO Products (VendorID, CategoryID, ProductName, Price, IsAvailable) VALUES
(1, 2, 'Bunny chow (quarter)',  45.00, 1),
(1, 2, 'Vetkoek with mince',    20.00, 1),
(2, 1, 'Spinach bunch',         12.00, 1),
(2, 1, 'Tomatoes (1kg)',        18.50, 1),
(3, 3, 'Men''s golf shirt',     90.00, 0);

INSERT INTO CustomerReviews (VendorID, Rating, Comment, IsVerifiedVisit) VALUES
(1, 5, 'Best bunny chow near the rank, always fresh.', 1),
(2, 4, 'Good prices, veggies are always crisp.',       1);
