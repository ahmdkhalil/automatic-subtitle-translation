// Enhanced Subtitle Translation Script with PDF and Word Document Support

class DocumentProcessor {
  static async processPDF(file) {
    // Dynamically import PDF.js 
    const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.mjs');
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
    const pdf = await loadingTask.promise;
    
    // Extract text from all pages
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  }
  
  static async processWordDocument(file) {
    // Use mammoth to convert .docx to text
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
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
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  static async processFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
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
  }
}

class TranslationSubtitleApp {
  constructor() {
    this.originalText = '';
    this.translatedText = '';
    
    // DOM Elements
    this.originalFileInput = document.getElementById('originalTextFile');
    this.translatedFileInput = document.getElementById('translatedTextFile');
    this.originalTextDisplay = document.getElementById('originalTextDisplay');
    this.translatedTextDisplay = document.getElementById('translatedTextDisplay');
    this.startButton = document.getElementById('startButton');
    this.stopButton = document.getElementById('stopButton');
    this.subtitleContainer = document.getElementById('subtitleContainer');
    this.statusDisplay = document.getElementById('status');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Original text file upload
    this.originalFileInput.addEventListener('change', async (event) => {
      try {
        const file = event.target.files[0];
        if (file) {
          this.originalText = await DocumentProcessor.processFile(file);
          this.originalTextDisplay.textContent = this.originalText;
          this.updateStatus(`Original text loaded: ${file.name}`);
        }
      } catch (error) {
        this.updateStatus(`Error loading original text: ${error.message}`, 'error');
      }
    });
    
    // Translated text file upload
    this.translatedFileInput.addEventListener('change', async (event) => {
      try {
        const file = event.target.files[0];
        if (file) {
          this.translatedText = await DocumentProcessor.processFile(file);
          this.translatedTextDisplay.textContent = this.translatedText;
          this.updateStatus(`Translated text loaded: ${file.name}`);
        }
      } catch (error) {
        this.updateStatus(`Error loading translated text: ${error.message}`, 'error');
      }
    });
    
    // Start and stop buttons
    this.startButton.addEventListener('click', () => this.startListening());
    this.stopButton.addEventListener('click', () => this.stopListening());
  }
  
  updateStatus(message, type = 'info') {
    this.statusDisplay.textContent = message;
    this.statusDisplay.className = `status ${type}`;
  }
  
  startListening() {
    if (!this.originalText || !this.translatedText) {
      this.updateStatus('Please upload both original and translated texts first.', 'error');
      return;
    }
    
    // Speech recognition setup (similar to previous implementation)
    try {
      this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onstart = () => {
        this.updateStatus('Listening...');
      };
      
      this.recognition.onend = () => {
        this.updateStatus('Stopped listening');
      };
      
      this.recognition.onerror = (event) => {
        this.updateStatus(`Speech recognition error: ${event.error}`, 'error');
      };
      
      this.recognition.onresult = (event) => {
        this.handleSpeechResult(event);
      };
      
      this.recognition.start();
    } catch (error) {
      this.updateStatus(`Error starting speech recognition: ${error.message}`, 'error');
    }
  }
  
  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
  
  handleSpeechResult(event) {
    // Similar to previous implementation, but with more robust matching
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join(' ')
      .toLowerCase();
    
    // Find the closest matching segment
    const matchedSegment = this.findBestMatchingSegment(transcript);
    
    if (matchedSegment) {
      this.updateSubtitle(matchedSegment.translatedText);
    }
  }
  
  findBestMatchingSegment(transcript) {
    // Split original and translated texts into segments
    const originalSegments = this.splitIntoSegments(this.originalText);
    const translatedSegments = this.splitIntoSegments(this.translatedText);
    
    // Find best matching segment
    for (let i = 0; i < originalSegments.length; i++) {
      const originalSeg = originalSegments[i].toLowerCase();
      if (transcript.includes(originalSeg)) {
        return {
          originalText: originalSegments[i],
          translatedText: translatedSegments[i] || ''
        };
      }
    }
    
    return null;
  }
  
  splitIntoSegments(text) {
    // Split into sentences, handling various punctuation
    return text.split(/[.!?]+/).filter(seg => seg.trim().length > 5);
  }
  
  updateSubtitle(text) {
    // Update subtitle with animation
    this.subtitleContainer.textContent = text;
    this.subtitleContainer.classList.remove('fade-in');
    void this.subtitleContainer.offsetWidth; // Trigger reflow
    this.subtitleContainer.classList.add('fade-in');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Dynamically load external libraries
  Promise.all([
    import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.mjs'),
    import('https://unpkg.com/mammoth@0.5.1/mammoth.browser.min.js')
  ]).then(() => {
    // Initialize the translation subtitle app
    window.translationApp = new TranslationSubtitleApp();
  }).catch(error => {
    console.error('Error loading libraries:', error);
  });
});
</parameter>
</invoke>