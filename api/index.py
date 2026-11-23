import os
import sys

# Tambahkan path root proyek ke sys.path agar app.py dan dependensinya dapat ditemukan
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app

# Entry point WSGI untuk Vercel Serverless Function
app.debug = False

if __name__ == "__main__":
    app.run()
