#!/bin/sh
echo "============================================="
echo "欢迎使用 BianBlog 博客系统"
echo "Github: https://github.com/mereithhh/bianblog"
echo "Version(Env): ${BIAN_BLOG_VERSION}"
echo "============================================="


sed "s/BIAN_BLOG_EMAIL/${EMAIL}/g" /app/caddyTemplate.json >/app/caddy.json
caddy start --config /app/caddy.json

node start.js
