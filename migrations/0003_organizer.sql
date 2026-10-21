CREATE TABLE financial_plans(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,payload TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE document_organization(receipt_id TEXT PRIMARY KEY REFERENCES receipts(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,creditor_key TEXT NOT NULL,tax_year INTEGER NOT NULL,tax_status TEXT NOT NULL,payload TEXT NOT NULL);
CREATE INDEX document_owner ON document_organization(user_id);
