const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let orderQueue = []; 
let orderIdCounter = 1;
const ORDER_STEPS = ['received', 'preparing', 'ready_for_delivery', 'completed'];
const newOrderSchema = z.object({
    items: z.array(z.string().min(1)).min(1),
    namaPelanggan: z.string().trim().min(1).optional(),
    nomorMeja: z.string().trim().min(1).optional(),
    payment: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1).optional(),
    note: z.string().trim().optional()
});
const menuDbPath = path.join(__dirname, 'public', 'data', 'menu.json');

function toDisplayOrderId(rawId) {
    const text = String(rawId ?? '').trim();
    if (!text) return 'QB-00000';
    if (text.startsWith('QB-')) return text;
    if (/^\d+$/.test(text)) return `QB-${text.padStart(5, '0')}`;
    const digits = text.replace(/\D/g, '');
    if (digits.length > 0) return `QB-${digits.slice(-5).padStart(5, '0')}`;
    return 'QB-00000';
}

function getMenuItems() {
    try {
        const raw = fs.readFileSync(menuDbPath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

app.use(express.static('public'));
app.use(express.json());

app.get('/api/menu', (_req, res) => {
    const menuItems = getMenuItems();
    res.json({
        success: true,
        data: menuItems
    });
});

app.get('/api/menu/:id', (req, res) => {
    const menuItems = getMenuItems();
    const item = menuItems.find((menu) => menu.id === req.params.id);

    if (!item) {
        return res.status(404).json({
            success: false,
            error: {
                message: 'Menu item not found.'
            }
        });
    }

    return res.json({
        success: true,
        data: item
    });
});

app.post('/api/promos/claim', (req, res) => {
    const promoSchema = z.object({
        promoCode: z.string().trim().min(3),
        claimedAt: z.string().datetime()
    });
    const parsed = promoSchema.safeParse(req.body || {});

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Invalid promo payload.'
            }
        });
    }

    const { promoCode, claimedAt } = parsed.data;
    return res.json({
        success: true,
        data: {
            code: promoCode.trim().toUpperCase(),
            claimedAt
        }
    });
});

io.on('connection', (socket) => {
    socket.emit('updateQueue', orderQueue);

    socket.on('newOrder', (data, ack) => {
        const parsed = newOrderSchema.safeParse(data);
        if (!parsed.success) {
            if (typeof ack === 'function') {
                ack({
                    success: false,
                    error: 'Invalid order payload'
                });
            }
            return;
        }

        const orderInput = parsed.data;
        const order = { 
            id: orderIdCounter++, 
            orderCode: '',
            items: orderInput.items,
            namaPelanggan: orderInput.namaPelanggan || 'Pelanggan',
            meja: orderInput.nomorMeja || '-',
            status: 'received',
            payment: orderInput.payment || 'OVO',
            address: orderInput.address || 'Alamat belum diatur',
            note: orderInput.note || ''
        };
        order.orderCode = toDisplayOrderId(order.id);
        orderQueue.push(order); 
        io.emit('updateQueue', orderQueue);
        io.emit('orderStatusUpdated', { orderId: order.id, status: order.status });
        if (typeof ack === 'function') {
            ack({
                success: true,
                data: order
            });
        }
    });

    socket.on('updateOrderStatus', (payload) => {
        const order = orderQueue.find((item) => item.id === payload.orderId);
        if (!order) return;

        const nextStatus = payload.status;
        if (!ORDER_STEPS.includes(nextStatus)) return;

        order.status = nextStatus;
        io.emit('updateQueue', orderQueue);
        io.emit('orderStatusUpdated', { orderId: order.id, status: order.status });
    });

    socket.on('finishOrder', (orderId) => {
        const orderIndex = orderQueue.findIndex(order => order.id === orderId);
        
        if (orderIndex !== -1) {
            const finishedOrder = orderQueue[orderIndex];
            orderQueue.splice(orderIndex, 1);
            
            io.emit('updateQueue', orderQueue);
            io.emit('orderReady', finishedOrder);
        }
    });
});

app.post('/api/orders', (req, res) => {
    const parsed = newOrderSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: { message: 'Invalid order payload' }
        });
    }

    const orderInput = parsed.data;
    const order = {
        id: orderIdCounter++,
        orderCode: '',
        items: orderInput.items,
        namaPelanggan: orderInput.namaPelanggan || 'Pelanggan',
        meja: orderInput.nomorMeja || '-',
        status: 'received',
        payment: orderInput.payment || 'OVO',
        address: orderInput.address || 'Alamat belum diatur',
        note: orderInput.note || ''
    };
    order.orderCode = toDisplayOrderId(order.id);

    orderQueue.push(order);
    io.emit('updateQueue', orderQueue);
    io.emit('orderStatusUpdated', { orderId: order.id, status: order.status });

    return res.json({
        success: true,
        data: order
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
