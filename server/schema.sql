-- Database Schema for Coiffure Salon Management

-- Barbers Table
CREATE TABLE IF NOT EXISTS Barbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    photo_url TEXT,
    specialty VARCHAR(255),
    status ENUM('active', 'break', 'inactive') DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services Table
CREATE TABLE IF NOT EXISTS Services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration INT NOT NULL, -- duration in minutes
    category ENUM('adult', 'child') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Services (name, price, duration, category) VALUES 
('Coupe normale', 400.00, 20, 'adult'),
('Coupe dégradé + barbe', 500.00, 30, 'adult'),
('Barbe et tour d\'oreille', 300.00, 15, 'adult'),
('Coupe enfants', 300.00, 15, 'child'),
('Coupe dégradé + plaques', 700.00, 35, 'adult'),
('Les plaques (seules)', 250.00, 10, 'adult'),
('Coupe dégradé + lissage', 1000.00, 35, 'adult'),
('Lissage (seul)', 700.00, 10, 'adult'),
('Coupe dégradé + kératine', 3000.00, 60, 'adult'),
('Kératine (seule)', 2600.00, 30, 'adult'),
('Nettoyage de peau', 700.00, 30, 'adult');

-- Bookings Table
CREATE TABLE IF NOT EXISTS Bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    barber_id INT,
    service_id INT,
    type ENUM('appointment', 'queue') NOT NULL,
    status ENUM('waiting', 'on_chair', 'finished', 'cancelled') DEFAULT 'waiting',
    scheduled_time DATETIME,
    position INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barber_id) REFERENCES Barbers(id),
    FOREIGN KEY (service_id) REFERENCES Services(id)
);
