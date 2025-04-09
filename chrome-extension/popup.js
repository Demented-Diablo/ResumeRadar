// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const resumeInput = document.getElementById('resumeInput');
    const saveResumeButton = document.getElementById('saveResume');
    const checkButton = document.getElementById('checkButton');
    const resultElement = document.getElementById('result');
  
    // 1. Load existing resume from Chrome storage (if any)
    chrome.storage.local.get(['resumeText'], (data) => {
      if (data && data.resumeText) {
        resumeInput.value = data.resumeText;
      }
    });
  
    // 2. Save resume text to Chrome storage
    saveResumeButton.addEventListener('click', () => {
      const resumeText = resumeInput.value;
      chrome.storage.local.set({ resumeText }, () => {
        alert('Resume saved!');
      });
    });
  
    // 3. Send a message to the content script to do the check
    checkButton.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'CHECK_JOB' }, (response) => {
          if (response && response.score !== undefined) {
            resultElement.textContent = `Match Score: ${response.score}%`;
          } else if (response && response.error) {
            resultElement.textContent = `Error: ${response.error}`;
          } else {
            resultElement.textContent = 'No response from content script.';
          }
        });
      });
    });
  });
  