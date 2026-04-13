#!/usr/bin/env python3
"""
Test script for SASL Recognition API
"""

import requests
import base64
from PIL import Image
import io

def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Health check: {response.status_code}")
        print(response.json())
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_recognize_base64():
    """Test recognition with base64 encoded image"""
    try:
        # Create a simple test image (black square)
        img = Image.new('RGB', (100, 100), color='black')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        data = {"image": img_base64}

        response = requests.post("http://localhost:8000/recognize-base64", json=data)
        print(f"Base64 recognition: {response.status_code}")
        print(response.json())
        return response.status_code == 200
    except Exception as e:
        print(f"Base64 recognition failed: {e}")
        return False

def test_root():
    """Test the root endpoint"""
    try:
        response = requests.get("http://localhost:8000/")
        print(f"Root endpoint: {response.status_code}")
        print(response.json())
        return response.status_code == 200
    except Exception as e:
        print(f"Root endpoint failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing SASL Recognition API...")
    print("=" * 40)

    tests = [
        ("Health Check", test_health_check),
        ("Root Endpoint", test_root),
        ("Base64 Recognition", test_recognize_base64),
    ]

    passed = 0
    for test_name, test_func in tests:
        print(f"\nTesting {test_name}:")
        if test_func():
            passed += 1
            print("✅ PASSED")
        else:
            print("❌ FAILED")

    print(f"\nResults: {passed}/{len(tests)} tests passed")

    if passed == len(tests):
        print("🎉 All tests passed! API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the API logs for details.")