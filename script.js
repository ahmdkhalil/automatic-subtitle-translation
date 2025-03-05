class FileProcessor {
  static async processFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    try {
      switch (extension) {
        case 'pdf':
          return await this.processPDF(file);
        case 'docx':
        case 'doc':
          return await this.processWordDocument(file);
        case 'txt':
          return await this.processTextFile(file);
        default:
          throw new Error(`Unsupported file type: .${extension}`);
      }
    } catch (error) {
      console.error('File processing error:', error);
      throw error;
    }
  }
  
  static async processPDF(file) {
    return new Promise((resolve, reject) => {
      if (!pdfjsLib) {
        reject(new Error('PDF.js library not loaded'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          resolve(fullText.trim());
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  
  static async processWordDocument(file) {
    return new Promise((resolve, reject) => {
      if (!mammoth) {
        reject(new Error('Mammoth library not loaded'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  
  static async processTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

class TranslationSubtitleApp {
  constructor() {
    // File inputs and displays
    this.originalFileInput = document.getElementById('originalTextFile');
    this.translatedFileInput = document.getElementById('translatedTextFile');
    this.originalUploadBtn = document.getElementById('uploadOriginalBtn');
    this.translatedUploadBtn = document.getElementById('uploadTranslatedBtn');
    
    // Text display areas
    this.originalTextDisplay = document.getElementById('originalTextDisplay');
    this.translatedTextDisplay = document.getElementById('translatedTextDisplay');
    
    // Other elements
    this.startButton = document.getElementById('startButton');
    this.stopButton = document.getElementById('stopButton');
    this.subtitleContainer = document.getElementById('subtitleContainer');
    this.statusDisplay = document.getElementById('status');
    
    // Text storage
    this.originalText = '';
    this.translatedText = '';
    
    // Speech recognition
    this.recognition = null;
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Original file upload
    this.originalUploadBtn.addEventListener('click', async () => {
      const file = this.originalFileInput.files[0];
      if (!file) {
        this.updateStatus('Please select a file first', 'error');
        return;
      }
      
      try {
        this.originalText = await FileProcessor.processFile(file);
        this.originalTextDisplay.textContent = this.originalText;
        this.updateStatus(`Original text uploaded: ${file.name}`, 'success');
      } catch (error) {
        this.updateStatus(`Error uploading original text: ${error.message}`, 'error');
      }
    });
    
    // Translated file upload
    this.translatedUploadBtn.addEventListener('click', async () => {
      const file = this.translatedFileInput.files[0];
      if (!file) {
        this.updateStatus('Please select a file first', 'error');
        return;
      }
      
      try {
        this.translatedText = await FileProcessor.processFile(file);
        this.translatedTextDisplay.textContent = this.translatedText;
        this.updateStatus(`Translated text uploaded: ${file.name}`, 'success');
      } catch (error) {
        this.updateStatus(`Error uploading translated text: ${error.message}`, 'error');
      }
    });
    
    // Start and stop listening buttons
    this.startButton.addEventListener('click', () => this.startListening());
    this.stopButton.addEventListener('click', () => this.stopListening());
  }
  
  updateStatus(message, type = 'info') {
    console.log(`Status: ${message}`);
    this.statusDisplay.textContent = message;
    this.statusDisplay.className = `status ${type}`;
  }
  
  startListening() {
    // Check if texts are uploaded
    if (!this.originalText || !this.translatedText) {
      this.updateStatus('Please upload both original and translated texts first', 'error');
      return;
    }
    
    // Speech recognition setup (similar to previous implementation)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.updateStatus('Speech recognition not supported', 'error');
      return;
    }
    
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US'; // Adjust as needed
      
      this.recognition.onstart = () => {
        this.updateStatus('Listening...');
      };
      
      this.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        
        this.updateSubtitle(transcript);
      };
      
      this.recognition.onerror = (event) => {
        this.updateStatus(`Speech recognition error: ${event.error}`, 'error');
      };
      
      this.recognition.onend = () => {
        this.updateStatus('Stopped listening');
      };
      
      this.recognition.start();
    } catch (error) {
      this.updateStatus(`Error: ${error.message}`, 'error');
    }
  }
  
  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.updateStatus('Stopped listening');
    }
  }
  
  updateSubtitle(text) {
    this.subtitleContainer.textContent = text;
    this.subtitleContainer.classList.remove('fade-in');
    void this.subtitleContainer.offsetWidth; // Trigger reflow
    this.subtitleContainer.classList.add('fade-in');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.translationApp = new TranslationSubtitleApp();
});