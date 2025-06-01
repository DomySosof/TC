const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3020;

app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('expenses.db', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        db.run(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                installments INTEGER
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_id INTEGER,
                amount REAL NOT NULL,
                payment_date TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                installment_number INTEGER,
                FOREIGN KEY (expense_id) REFERENCES expenses(id)
            )
        `);
    }
});

app.get('/api/expenses', (req, res) => {
    db.all('SELECT * FROM expenses', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/expenses', (req, res) => {
    const { description, amount, category, date, payment_method, installments } = req.body;
    if (!description || !amount || !category || !date || !payment_method) {
        res.status(400).json({ error: 'Todos los campos requeridos deben estar completos' });
        return;
    }
    if (payment_method === 'Visa Cuotas' && (!installments || installments < 1)) {
        res.status(400).json({ error: 'El número de cuotas es requerido para Visa Cuotas' });
        return;
    }

    db.get('SELECT SUM(amount) as total FROM expenses WHERE payment_method = ?', [payment_method], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const currentTotal = row.total || 0;
        if (payment_method === 'Tarjeta de Crédito' && currentTotal + amount > 4800) {
            res.status(400).json({ error: 'El gasto excede el límite de Tarjeta de Crédito ($4800)' });
            return;
        }
        if (payment_method === 'Visa Cuotas' && currentTotal + amount > 9600) {
            res.status(400).json({ error: 'El gasto excede el límite de Visa Cuotas ($9600)' });
            return;
        }

        db.run(
            'INSERT INTO expenses (description, amount, category, date, payment_method, installments) VALUES (?, ?, ?, ?, ?, ?)',
            [description, amount, category, date, payment_method, installments || null],
            function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ id: this.lastID });
            }
        );
    });
});

app.delete('/api/expenses/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM expenses WHERE id = ?', id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ deleted: this.changes });
    });
});

app.post('/api/payments', (req, res) => {
    const { expense_id, amount, payment_date, payment_method, installment_number } = req.body;
    if (!amount || !payment_date || !payment_method) {
        res.status(400).json({ error: 'Todos los campos requeridos deben estar completos' });
        return;
    }

    db.get('SELECT SUM(amount) as total FROM expenses WHERE payment_method = ?', [payment_method], (err, expenseRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const currentExpenseTotal = expenseRow.total || 0;

        db.get('SELECT SUM(amount) as total FROM payments WHERE payment_method = ?', [payment_method], (err, paymentRow) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            const currentPaymentTotal = paymentRow.total || 0;

            if (currentPaymentTotal + amount > currentExpenseTotal) {
                res.status(400).json({ error: 'El pago excede el total de gastos registrados' });
                return;
            }

            db.run(
                'INSERT INTO payments (expense_id, amount, payment_date, payment_method, installment_number) VALUES (?, ?, ?, ?, ?)',
                [expense_id || null, amount, payment_date, payment_method, installment_number || null],
                function (err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ id: this.lastID });
                }
            );
        });
    });
});

app.get('/api/payments', (req, res) => {
    db.all('SELECT * FROM payments', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.delete('/api/payments/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM payments WHERE id = ?', id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ deleted: this.changes });
    });
});

app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'index.html');
    console.log('Solicitando index.html desde:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error al servir index.html:', err);
            res.status(500).send('Error al cargar la página');
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});