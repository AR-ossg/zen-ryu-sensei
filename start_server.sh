#!/bin/bash

# Zen Ryu Sensei - Local Server Launcher
echo "⛩️ Iniciando el templo digital..."

# Verificar si Python 3 está instalado
if ! command -v python3 &> /dev/null
then
    echo "❌ Error: Python 3 no está instalado. Por favor instala Python para continuar."
    exit 1
fi

# Ejecutar el servidor
python3 "server.py"
