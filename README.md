# AuraMed — AI Medical Report Explainer

A full-stack web application designed for educational explanations of medical lab sheets. AuraMed extracts biological markers and parameters from uploaded PDFs or image scans, maps them against clinical standard ranges, and translates them into simple, patient-friendly language using AI.

---

## Architecture Overview

```
                        +----------------------------+
                        |   Vite + React Frontend    |
                        |      (Port: 5173)          |
                        +--------------+-------------+
                                       |
                                       v
                        +----------------------------+
                        |  Node.js / Express Backend |
                        |      (Port: 5000)          |
                        +-------+------------+-------+
                                |            |
            (Mongoose Client)   v            v   (Axios Proxy)
                       +------------+    +------------+
                       |  MongoDB   |    |  FastAPI   |
                       | (Database) |    | AI Backend |
                       +------------+    | (Port:8000)|
                                         +-----+------+
                                               |
                                               v
                                         +-----+------+
                                         |  GROQ API  |
                                         |  (Llama 3) |
                                         +------------+
```

- **React Frontend**: Modern, glassmorphic layout styled with Tailwind CSS, utilizing React Router and Lucide Icons, and Recharts for trend visualizers.
- **Express Backend Gateway**: Manages user authentication (JWT), secure hashing (bcrypt), and stores reports and chat transcripts in MongoDB.
- **FastAPI AI Backend**: Performs PDF text scraping (pypdf), receives images for OCR, and orchestrates calls to the GROQ API.

---

## Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [Python](https://www.python.org/) (v3.10+) installed.

### 1. MongoDB Database
AuraMed expects a MongoDB instance running locally on `mongodb://127.0.0.1:27017/med-explainer`.
- If you have MongoDB installed locally, ensure the service is running.
- Alternatively, you can edit the `MONGODB_URI` environment variable inside `backend/.env` to point to a MongoDB Atlas cluster URI.

### 2. FastAPI AI Backend
1. Open a terminal and navigate to the `ai_backend` directory:
   ```bash
   cd ai_backend
   ```
2. Activate the pre-created virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```
3. (Optional) In the `.env` file inside `ai_backend`, add your GROQ API key:
   ```env
   GROQ_API_KEY=your_actual_groq_api_key
   ```
   *Note: If left empty, AuraMed runs in **Mock AI mode**, automatically parsing standard tests (like Hemoglobin, Glucose, Cholesterol) to generate realistic samples for testing charts, comparisons, and chat functions.*
4. Start the FastAPI server:
   ```bash
   python main.py
   ```
   The AI backend will start running on `http://127.0.0.1:8000`.

### 3. Express.js Backend Gateway
1. Open a new terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Start the development gateway server:
   ```bash
   npm run dev
   ```
   The backend will start running on `http://localhost:5000`.

### 4. React Frontend
1. Open a third terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The frontend app will be active on `http://localhost:5173`. Open this URL in your web browser.

---

## Features Walkthrough

1. **Authentication**: Register an account and sign in. JWT tokens are securely stored in your browser's localStorage.
2. **Dashboard Overview**: Displays summary stats on your markers (Abnormal flags, total uploads, normal stats) and your upload log.
3. **Medical Sheet Upload**: Drag and drop a blood test PDF or image, fill in the patient name, and see a step-by-step extraction progress interface.
4. **Interactive Explainer & Chatbot**:
   - Left Panel: Overall patient summary, clinical parameter list with badges (High/Low/Normal). Expand any item to read what it means.
   - Right Panel: Chatbot linked specifically to the report context. Ask questions like: *"How can I improve my iron levels?"*
5. **Trends & Charts**: Track historical blood markers (e.g. Hemoglobin over time) with Recharts. Shaded zones represent standard normal ranges.
6. **Side-by-Side Comparison**: Select 2 or 3 reports from the dashboard and compare parameter differences side-by-side with automatic delta indicators.

---

## Educational Disclaimer
AuraMed is a college demonstration application meant for educational purposes. It uses artificial intelligence to interpret lab results and should never be used as a substitute for professional medical advice, diagnosis, or treatment.
