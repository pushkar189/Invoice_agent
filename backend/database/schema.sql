-- =========================================================
-- PURCHASE ITEMS
-- Line items belonging to a PURCHASE
-- =========================================================
CREATE TABLE purchase_items (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    purchase_id         BIGINT NOT NULL,
    product_id          BIGINT NOT NULL,
    variant_id          BIGINT NULL,
    batch_id            BIGINT NULL,
    quantity            INT NOT NULL,
    unit_price          DECIMAL(12,2) NOT NULL,
    discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_price         DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_items_product
        FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_purchase_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    CONSTRAINT fk_purchase_items_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id  ON purchase_items(product_id);


-- =========================================================
-- PURCHASE RETURNS
-- Header record for a return made against a PURCHASE
-- =========================================================
CREATE TABLE purchase_returns (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    purchase_id         BIGINT NOT NULL,
    supplier_id         BIGINT NOT NULL,
    warehouse_id        BIGINT NOT NULL,
    created_by          BIGINT NOT NULL,
    return_number       VARCHAR(50) NOT NULL UNIQUE,
    return_date         DATE NOT NULL,
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason              VARCHAR(255) NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending', -- e.g. pending, approved, completed, cancelled
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_returns_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    CONSTRAINT fk_purchase_returns_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_purchase_returns_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_purchase_returns_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_purchase_returns_purchase_id ON purchase_returns(purchase_id);
CREATE INDEX idx_purchase_returns_supplier_id ON purchase_returns(supplier_id);


-- =========================================================
-- PURCHASE RETURN ITEMS
-- Line items belonging to a PURCHASE_RETURN
-- =========================================================
CREATE TABLE purchase_return_items (
    id                     BIGINT PRIMARY KEY AUTO_INCREMENT,
    purchase_return_id     BIGINT NOT NULL,
    product_id             BIGINT NOT NULL,
    variant_id             BIGINT NULL,
    batch_id               BIGINT NULL,
    quantity               INT NOT NULL,
    unit_price             DECIMAL(12,2) NOT NULL,
    total_price            DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_pri_purchase_return
        FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pri_product
        FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_pri_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    CONSTRAINT fk_pri_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE INDEX idx_pri_purchase_return_id ON purchase_return_items(purchase_return_id);
CREATE INDEX idx_pri_product_id         ON purchase_return_items(product_id);


-- =========================================================
-- SALES RETURNS
-- Header record for a return made against a SALE
-- =========================================================
CREATE TABLE sales_returns (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    sale_id             BIGINT NOT NULL,
    customer_id         BIGINT NOT NULL,
    warehouse_id        BIGINT NOT NULL,
    created_by          BIGINT NOT NULL,
    return_number       VARCHAR(50) NOT NULL UNIQUE,
    return_date         DATE NOT NULL,
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason              VARCHAR(255) NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending', -- e.g. pending, approved, completed, cancelled
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_returns_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id),
    CONSTRAINT fk_sales_returns_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_sales_returns_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_sales_returns_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_sales_returns_sale_id     ON sales_returns(sale_id);
CREATE INDEX idx_sales_returns_customer_id ON sales_returns(customer_id);


-- =========================================================
-- SALES RETURN ITEMS
-- Line items belonging to a SALES_RETURN
-- =========================================================
CREATE TABLE sales_return_items (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    sales_return_id     BIGINT NOT NULL,
    product_id          BIGINT NOT NULL,
    variant_id          BIGINT NULL,
    batch_id            BIGINT NULL,
    quantity            INT NOT NULL,
    unit_price          DECIMAL(12,2) NOT NULL,
    total_price         DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_sri_sales_return
        FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sri_product
        FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_sri_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    CONSTRAINT fk_sri_batch
        FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE INDEX idx_sri_sales_return_id ON sales_return_items(sales_return_id);
CREATE INDEX idx_sri_product_id      ON sales_return_items(product_id);
