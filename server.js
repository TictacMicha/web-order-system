const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let orderQueue = []; 
let orderIdCounter = 1;

app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.emit('updateQueue', orderQueue);

    socket.on('newOrder', (data) => {
        const order = { 
            id: orderIdCounter++, 
            items: data.items, 
            namaPelanggan: data.namaPelanggan, 
            meja: data.nomorMeja, 
            status: 'cooking' 
        };
        orderQueue.push(order); 
        io.emit('updateQueue', orderQueue); 
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});