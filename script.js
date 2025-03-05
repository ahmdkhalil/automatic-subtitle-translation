// Main component architecture for the translation subtitle system

// 1. Speech Recognition Module
class SpeechTracker {
  constructor(originalText, translatedText) {
    this.originalText = originalText;
    this.translatedText = translatedText;
    this.recognition = new webkitSpeechRecognition() || new SpeechRecognition();
    this.currentPosition = 0;
    this.alignmentMap = this.createAlignmentMap();
    this.isListening = false;
  }

  // Create mapping between original text segments and translated segments
  createAlignmentMap() {
    // Split texts into sentences or paragraphs
    const originalSegments = this.splitIntoSegments(this.originalText);
    const translatedSegments = this.splitIntoSegments(this.translatedText);
    
    // Create alignment based on position (assumes 1:1 mapping)
    // In a production system, this would use more sophisticated alignment algorithms
    const alignmentMap = [];
    const minLength = Math.min(originalSegments.length, translatedSegments.length);
    
    for (let i = 0; i < minLength; i++) {
      alignmentMap.push({
        original: originalSegments[i],
        translated: translatedSegments[i],
        startTime: null,
        endTime: null
      });
    }
    
    return alignmentMap;
  }
  
  // Split text into segments (sentences or paragraphs)
  splitIntoSegments(text) {
    // Simple sentence splitting - would be more sophisticated in production
    return text.split(/[.!?]+/).filter(segment => segment.trim().length > 0);
  }
  
  // Start listening to speech
  startListening() {
    if (this.isListening) return;
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US'; // Set to the language of original text
    
    this.recognition.onresult = (event) => this.handleSpeechResult(event);
    this.recognition.onstart = () => {
      console.log("Speech recognition started");
      this.isListening = true;
    };
    this.recognition.onerror = (event) => console.error("Speech recognition error", event);
    this.recognition.onend = () => {
      console.log("Speech recognition ended");
      this.isListening = false;
    };
    
    this.recognition.start();
  }
  
  // Stop listening
  stopListening() {
    if (!this.isListening) return;
    this.recognition.stop();
    this.isListening = false;
  }
  
  // Handle speech recognition results
  handleSpeechResult(event) {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    // Find matching segment in original text
    const matchedSegmentIndex = this.findMatchingSegment(transcript);
    
    if (matchedSegmentIndex !== -1 && matchedSegmentIndex !== this.currentPosition) {
      this.currentPosition = matchedSegmentIndex;
      
      // Emit event with corresponding translated text
      const translatedSegment = this.alignmentMap[matchedSegmentIndex].translated;
      document.dispatchEvent(new CustomEvent('subtitleUpdate', { 
        detail: { 
          subtitle: translatedSegment,
          index: matchedSegmentIndex
        }
      }));
    }
  }
  
  // Find which segment of the original text matches the current speech
  findMatchingSegment(transcript) {
    // In a real system, this would use fuzzy matching and more sophisticated alignment
    for (let i = 0; i < this.alignmentMap.length; i++) {
      const segment = this.alignmentMap[i].original;
      if (transcript.toLowerCase().includes(segment.toLowerCase())) {
        return i;
      }
    }
    return -1;
  }
}

// 2. Subtitle Display Component
class SubtitleDisplay {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentSubtitle = '';
    
    // Listen for subtitle updates
    document.addEventListener('subtitleUpdate', (event) => {
      this.updateSubtitle(event.detail.subtitle);
    });
  }
  
  // Update the displayed subtitle
  updateSubtitle(text) {
    this.currentSubtitle = text;
    this.container.textContent = text;
    
    // Add animation for subtitle transition
    this.container.classList.remove('fade-in');
    void this.container.offsetWidth; // Trigger reflow
    this.container.classList.add('fade-in');
  }
}

// 3. Main Application Controller
class TranslationSubtitleApp {
  constructor(originalText, translatedText, subtitleContainerId) {
    this.speechTracker = new SpeechTracker(originalText, translatedText);
    this.subtitleDisplay = new SubtitleDisplay(subtitleContainerId);
  }
  
  start() {
    this.speechTracker.startListening();
  }
  
  stop() {
    this.speechTracker.stopListening();
  }
  
  // Load texts from files
  static async loadFromFiles(originalTextFile, translatedTextFile, subtitleContainerId) {
    try {
      const originalText = await fetch(originalTextFile).then(r => r.text());
      const translatedText = await fetch(translatedTextFile).then(r => r.text());
      
      return new TranslationSubtitleApp(originalText, translatedText, subtitleContainerId);
    } catch (error) {
      console.error("Error loading text files:", error);
      throw error;
    }
  }
}

// Usage Example
document.addEventListener('DOMContentLoaded', async () => {
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  
  // Initialize app with example texts
  const originalText = `Hello. How are you today? I hope you're doing well. 
  Let me tell you about this interesting project I'm working on.
  It involves automatic translation of subtitles based on speech recognition.`;
  
  const translatedText = `Bonjour. Comment allez-vous aujourd'hui? J'espère que vous allez bien.
  Laissez-moi vous parler de ce projet intéressant sur lequel je travaille.
  Il s'agit de la traduction automatique de sous-titres basée sur la reconnaissance vocale.`;
  
  const app = new TranslationSubtitleApp(originalText, translatedText, 'subtitleContainer');
  
  startButton.addEventListener('click', () => app.start());
  stopButton.addEventListener('click', () => app.stop());
});