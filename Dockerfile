# Gunakan image Node.js yang ringan
FROM node:18-alpine

# Buat direktori kerja di dalam container
WORKDIR /usr/src/app

# Salin file package.json dan install dependensi
COPY package*.json ./
RUN npm install

# Salin seluruh kode aplikasi
COPY . .

# Ekspos port 3000
EXPOSE 3000

# Perintah untuk menjalankan aplikasi
CMD ["node", "server.js"]