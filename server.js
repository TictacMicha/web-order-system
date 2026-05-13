const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Menggunakan array sebagai Queue untuk menyimpan antrean pesanan
let orderQueue = []; 
let orderIdCounter = 1;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User terhubung:', socket.id);

    // Kirim antrean saat ini ke chef yang baru terhubung
    socket.emit('updateQueue', orderQueue);

    // Enqueue: Pelanggan membuat pesanan baru
    socket.on('newOrder', (item) => {
        const order = { id: orderIdCounter++, item: item, status: 'cooking' };
        orderQueue.push(order); // Masukkan ke array queue
        console.log('Pesanan masuk:', order);
        
        // Broadcast antrean terbaru ke semua chef
        io.emit('updateQueue', orderQueue); 
    });

    // Dequeue: Chef menyelesaikan pesanan
    socket.on('finishOrder', (orderId) => {
        // Hapus pesanan dari array queue
        orderQueue = orderQueue.filter(order => order.id !== orderId);
        
        // Update layar chef
        io.emit('updateQueue', orderQueue);
        
        // Kirim notifikasi ke pelanggan bahwa makanan siap
        io.emit('orderReady', orderId);
        console.log(`Pesanan ${orderId} selesai dan di-dequeue.`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});