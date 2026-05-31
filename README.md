# QuickBite Web Order System

Aplikasi order makanan berbasis `Express + Socket.IO` dengan frontend static (`public/`).

## Prasyarat

- VM Linux (disarankan Ubuntu 22.04+)
- Docker Engine
- Docker Compose Plugin (`docker compose`)
- Git

## 1) Setup VM

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Logout/login ulang setelah menambahkan user ke group `docker`.

## 2) Clone Project

```bash
git clone <URL_REPOSITORY_ANDA> web-order-system
cd web-order-system
```

## 3) Jalankan dengan Docker Compose

```bash
docker compose up -d --build
```

Default app berjalan di port `3001`.

Test:

```bash
curl http://localhost:3001/api/menu
```

## 4) Konfigurasi Port (Opsional)

Buat file `.env` di root project:

```env
APP_PORT=3001
```

Lalu restart:

```bash
docker compose up -d --build
```

## 5) Update Deployment

Saat ada perubahan code:

```bash
git pull
docker compose up -d --build
```

## 6) Monitoring & Troubleshooting

Lihat status container:

```bash
docker compose ps
```

Lihat log realtime:

```bash
docker compose logs -f quickbite-app
```

Stop service:

```bash
docker compose down
```

## 7) Struktur Deployment yang Dipakai

- `Dockerfile`: image production app Node.js
- `docker-compose.yml`: orkestrasi container untuk VM
- `server.js`: API + Socket.IO server
- `public/`: static frontend files

## 8) Deployment Step-by-Step di AWS EC2

### A. Buat EC2 Instance

1. Buka AWS Console -> EC2 -> Launch Instance.
2. Gunakan:
   - AMI: `Ubuntu Server 22.04 LTS`
   - Instance type: minimal `t3.small` (boleh `t3.micro` untuk testing ringan)
3. Buat / pilih key pair (`.pem`).
4. Security Group inbound:
   - `SSH` port `22` dari IP kamu
   - `HTTP` port `80` dari `0.0.0.0/0`
   - `Custom TCP` port `3001` dari `0.0.0.0/0` (jika akses langsung tanpa Nginx)
5. Launch instance.

### B. SSH ke EC2

```bash
chmod 400 /path/your-key.pem
ssh -i /path/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### C. Install Docker + Compose

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Logout lalu login ulang SSH agar group `docker` aktif:

```bash
exit
ssh -i /path/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### D. Clone Project di EC2

```bash
git clone <URL_REPOSITORY_ANDA> web-order-system
cd web-order-system
```

### E. Jalankan Aplikasi

```bash
docker compose up -d --build
```

Check:

```bash
docker compose ps
curl http://localhost:3001/api/menu
```

### F. Akses dari Browser

- Direct port: `http://<EC2_PUBLIC_IP>:3001`
- Jika pakai domain/Nginx reverse proxy, arahkan ke service ini di port `3001`.

### G. Update Rilis

```bash
cd web-order-system
git pull
docker compose up -d --build
```

### H. Debug Cepat

```bash
docker compose logs -f quickbite-app
docker compose restart quickbite-app
docker compose down
```
