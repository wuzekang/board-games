#!/bin/bash
# Run once on EC2 to set up board-games service
# Usage: bash setup-ec2.sh

set -e

# Create systemd service
sudo tee /etc/systemd/system/board-games.service << 'EOF'
[Unit]
Description=Board Games Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/board-games/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=DB_PATH=/home/ubuntu/board-games/server/data/board-games.db
Environment=WEB_DIST=/home/ubuntu/board-games/web/dist
Environment=MIGRATIONS_FOLDER=/home/ubuntu/board-games/server/migrations

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable board-games

# Create nginx config
sudo tee /etc/nginx/sites-available/play << 'EOF'
server {
    listen 80;
    server_name play.plota.cc;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/play /etc/nginx/sites-enabled/play
sudo nginx -t && sudo systemctl reload nginx

echo "Setup complete. Deploy via GitHub Actions or run: sudo systemctl start board-games"
