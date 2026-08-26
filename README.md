<div align="center">

# 🌾 AgriSight — Intelligent Agricultural Intelligence Platform
### *Krishi Saarthi — Edge-AI Digital Twin & Field Precision Ecosystem*

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_Edge_AI-black?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.ai/)
[![LLaVA](https://img.shields.io/badge/LLaVA-7B_Vision-FF6F61?style=for-the-badge&logo=openai&logoColor=white)](https://ollama.ai/)
[![Open-Meteo](https://img.shields.io/badge/Weather-Open--Meteo-007ACC?style=for-the-badge&logo=cloud&logoColor=white)](https://open-meteo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge)](LICENSE)

<p align="center">
  <a href="#-key-features"><b>Key Features</b></a> •
  <a href="#-system-architecture"><b>Architecture</b></a> •
  <a href="#-ai-engine--models"><b>AI Models</b></a> •
  <a href="#-getting-started"><b>Getting Started</b></a> •
  <a href="#-tech-stack"><b>Tech Stack</b></a> •
  <a href="#-sdg-impact"><b>UN SDG Impact</b></a>
</p>

---

</div>

## 🌟 Overview

**AgriSight (Krishi Saarthi)** is a production-grade, **field-centric digital twin and agricultural intelligence platform** built for modern climate-resilient farming. 

Unlike traditional agro-apps that rely on static cloud advice, AgriSight runs **100% direct-to-edge AI orchestration via local Ollama inference** combined with real-time geospatial field boundary mapping, 61-day historical microclimate tracking, and automated parametric crop insurance verification.

---

## ⚡ Key Features

```
  🗺️ FIELD BOUNDARY MAPPING        🧠 DIRECT OLLAMA EDGE AI        🌦️ 61-DAY CLIMATE ENGINE
  ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
  │ Leaflet polygon draw   │      │ Gemma 3:4b advisory    │      │ Open-Meteo hourly data │
  │ Turf.js area & centroid│ ────►│ LLaVA 7b leaf vision   │ ────►│ Soil moisture 0-27cm   │
  │ Auto-hectare compute   │      │ Zero cloud API latency │      │ Heatwave & dry risk    │
  └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### 🛰️ 1. Field-Centric Digital Twin & GIS Mapping
* **Interactive Field Boundary Polygon Drawer**: Custom Leaflet.js polygon editor powered by Turf.js for instantaneous acre/hectare calculation and centroid pinpointing.
* **Multi-Plot Management**: Track multiple fields (`FIELD-001`, `FIELD-002`) with unique crop, soil, and sowing stage histories.

### 🤖 2. Local AI Edge Orchestration (Zero Cloud Fees)
* **Direct Browser Proxy**: Routes requests directly to local `http://127.0.0.1:11434` via Vite proxy, bypassing cloud bottlenecks.
* **LLaVA 7B Plant Health Diagnostics**: Upload/snap plant leaf images for instant local vision analysis, identifying blight, rust, and pests with organic & chemical treatment remedies.
* **Gemma 3 Multilingual Chat**: Voice-enabled advisory in **English, Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), and Kannada (ಕನ್ನಡ)**.

### 🌦️ 3. Precision Weather & Soil Microclimate
* **61-Day Historical Analysis**: Pulls 60+ days of historical weather data + 7-day forward forecasts via Open-Meteo API.
* **Sub-Surface Soil Intelligence**: Real-time soil moisture tracking (1-3cm & 9-27cm) and multi-depth temperatures (0cm, 6cm, 18cm).
* **SoilGrids & Lab Integration**: Automated ISRIC SoilGrids GIS retrieval + manual soil test lab report entry for N-P-K & pH optimization.

### 🛡️ 4. Parametric Crop Insurance & Evidence Engine
* **NDVI Vegetation Health Index**: Simulates satellite vegetation indices against baseline historical benchmarks.
* **Automated Claim Pack Generator**: Generates cryptographic evidence hashes and instant PDF claim documentation for PMFBY insurance claims.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([👨‍🌾 Farmer / Agronomist]) <--> Client[💻 React 19 Frontend + Vite]
    
    subgraph Edge AI Layer
        Client <-->|/ollama proxy| Ollama[🤖 Ollama Engine]
        Ollama <--> Gemma[🧠 Gemma 3:4b - Advisory]
        Ollama <--> LLaVA[👁️ LLaVA:7b - Vision Scan]
    
    subgraph Data & GIS APIs
        Client <-->|REST API| Weather[🌦️ Open-Meteo Engine]
        Client <-->|REST API| SoilGrids[🌍 ISRIC SoilGrids API]
        Client <-->|REST API| Mandi[💰 Data.gov.in Market Prices]
    
    subgraph Backend & Persistence
        Client <-->|PHP PDO| Backend[🐘 XAMPP PHP Backend]
        Backend <--> DB[(🗄️ MySQL agrivision DB)]
    
```

---

## 🤖 AI Engine & Model Setup

AgriSight is designed to work seamlessly with local LLMs and Multimodal Vision models.

| Task | Primary Model | Fallback Model | Memory |
| :--- | :--- | :--- | :--- |
| **Multilingual Chat Advisory** | `gemma3:4b` | `gemma4:latest` | ~3.3 GB |
| **Plant Leaf Disease Vision** | `llava:7b` | `llava:latest` | ~4.1 GB |

### Pulling Models with Ollama

Make sure [Ollama](https://ollama.ai/) is installed and running on your system, then pull the models:

```bash
# Pull text advisory model
ollama pull gemma3:4b

# Pull vision diagnostic model
ollama pull llava:7b
```

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js** >= 18.x
* **XAMPP / Apache + MySQL** (for backend persistence)
* **Ollama Desktop** (running on `http://127.0.0.1:11434`)

### 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Khadeer0210/Agrisight.git
   cd Agrisight
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   * Start Apache and MySQL in XAMPP.
   * Run the database initializer via browser or terminal:
     ```bash
     http://localhost/agrivision/api/setup.php
     ```

4. **Start Dev Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS Design Tokens (Glassmorphism)
* **Mapping & GIS**: Leaflet.js, Leaflet-Draw, Turf.js
* **AI Orchestration**: Direct Ollama API Proxy, Web Speech API (STT & TTS)
* **Backend**: PHP 8.x (PDO), MySQL
* **APIs**: Open-Meteo Weather API, ISRIC SoilGrids REST API, Data.gov.in Agmarknet Market API

---

## 🌍 UN Sustainable Development Goals (SDG) Alignment

| Goal | Description | Platform Contribution |
| :---: | :--- | :--- |
| **SDG 1** | **No Poverty** | Protects smallholder farmer income via parametric insurance verification |
| **SDG 2** | **Zero Hunger** | Enhances crop yields through precise ML disease diagnosis & soil prescriptions |
| **SDG 12** | **Responsible Consumption** | Prevents over-fertilization and optimizes chemical usage |
| **SDG 13** | **Climate Action** | Provides 60-day extreme weather risk advisories and irrigation alerts |

---

<div align="center">

Made with ❤️ for climate-resilient agriculture.

</div>
