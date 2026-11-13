/**
 * AI Agent Chatbot Widget
 * Natural language conversation interface for complaint reporting
 */

if (typeof window.SERVER_URL === 'undefined') {
    window.SERVER_URL = (typeof window !== 'undefined' && window.location && window.location.origin) 
        ? window.location.origin 
        : 'https://minor-project-t1cf.onrender.com';
}

// Store conversation history
let conversationHistory = [];
let currentLanguage = localStorage.getItem('lang') || 'en';

// Translations
const translations = {
    en: {
        greeting: "Hey! 👋 I'm your civic assistant. What can I help you with?",
        startReporting: "Let's get started! Tell me about the issue you want to report.",
        trackComplaint: "Sure! I'll help you track your complaint. Can you give me your complaint ID?",
        assignIssue: "Got it! Which issue would you like to assign?",
        viewDashboard: "Perfect! Let me open the dashboard for you.",
        generateReport: "I'll generate a comprehensive report for you.",
        placeholder: "Ask me anything... (e.g., 'There's a pothole on Main Street')",
        send: "Send",
        close: "Close",
        chat: "Chat with AI",
        loading: "Thinking...",
        error: "Sorry, I didn't understand that. Could you rephrase?"
    },
    hi: {
        greeting: "नमस्ते! 👋 मैं आपका सिविक सहायक हूँ। मैं आपकी क्या मदद कर सकता हूँ?",
        startReporting: "चलिए शुरू करते हैं! मुझे बताएं कि आप क्या समस्या रिपोर्ट करना चाहते हैं।",
        trackComplaint: "बिल्कुल! मैं आपकी शिकायत का ट्रैक करने में मदद करूँगा। क्या आप अपना complaint ID दे सकते हैं?",
        assignIssue: "समझ गया! आप कौन सी समस्या assign करना चाहते हैं?",
        viewDashboard: "बिल्कुल! मैं डैशबोर्ड खोलता हूँ।",
        generateReport: "मैं आपके लिए एक comprehensive report तैयार करूँगा।",
        placeholder: "मुझसे कुछ भी पूछें... (जैसे, 'Main Street पर एक गड्ढा है')",
        send: "भेजें",
        close: "बंद करें",
        chat: "AI से बात करें",
        loading: "सोच रहा हूँ...",
        error: "क्षमा करें, मुझे समझ नहीं आया। क्या आप फिर से कह सकते हैं?"
    }
};

/**
 * Initialize AI Chat Widget
 */
function initializeAIChat() {
    // Create chat widget HTML
    const chatHTML = `
        <div id="ai-chat-widget" class="ai-chat-widget">
            <!-- Chat Header -->
            <div class="ai-chat-header">
                <div class="ai-chat-title">
                    <div class="ai-avatar-badge">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem; letter-spacing: 0.2px;">${translations[currentLanguage].chat}</div>
                        <div style="font-size: 0.72rem; color: #a5f3fc; display: flex; align-items: center; gap: 5px; margin-top: 2px;">
                            <span class="ai-status-pulse"></span> Intelligent Municipal Copilot
                        </div>
                    </div>
                </div>
                <button class="ai-chat-close" onclick="closeAIChat()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Chat Messages Container -->
            <div class="ai-chat-messages" id="ai-chat-messages">
                <div class="ai-chat-message ai-message">
                    <div class="ai-chat-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="ai-chat-text">
                        ${translations[currentLanguage].greeting}
                    </div>
                </div>
            </div>

            <!-- Chat Input -->
            <div class="ai-chat-input-container">
                <input 
                    type="text" 
                    id="ai-chat-input" 
                    class="ai-chat-input" 
                    placeholder="${translations[currentLanguage].placeholder}"
                    autocomplete="off"
                    onkeypress="handleChatKeypress(event)"
                />
                <button class="ai-chat-send" onclick="sendAIMessage()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>

        <!-- Chat Toggle Button (Floating) -->
        <button class="ai-chat-toggle" id="ai-chat-toggle" onclick="toggleAIChat()" title="${translations[currentLanguage].chat}">
            <i class="fas fa-robot"></i>
        </button>
    `;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', chatHTML);

    // Add CSS styles
    addAIChatStyles();

    // Focus input on load
    setTimeout(() => {
        const input = document.getElementById('ai-chat-input');
        if (input) input.focus();
    }, 500);
}

/**
 * Add CSS styles for AI Chat widget
 */
function addAIChatStyles() {
    const styles = `
        /* AI Chat Widget */
        .ai-chat-widget {
            position: fixed;
            bottom: 85px;
            right: 24px;
            width: 400px;
            max-width: 92vw;
            height: 610px;
            background: white;
            border-radius: 24px;
            box-shadow: 0 16px 48px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 9998;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            overflow: hidden;
        }

        .ai-chat-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%);
            color: white;
            padding: 1.15rem 1.25rem;
            border-radius: 24px 24px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
        }

        .ai-chat-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 600;
            font-size: 1rem;
        }

        .ai-avatar-badge {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            color: #67e8f9;
        }

        .ai-status-pulse {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 8px #22c55e;
            animation: pulse 2s infinite;
        }

        .ai-chat-close {
            background: rgba(255, 255, 255, 0.15);
            border: none;
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.25s;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.95rem;
        }

        .ai-chat-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }

        .ai-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .ai-chat-message {
            display: flex;
            gap: 0.75rem;
            animation: fadeIn 0.3s ease-out;
        }

        .ai-chat-message.user-message {
            justify-content: flex-end;
        }

        .ai-chat-message.user-message .ai-chat-text {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            border-radius: 18px 18px 4px 18px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .ai-chat-message.ai-message .ai-chat-text {
            background: white;
            color: #1e293b;
            border-radius: 18px 18px 18px 4px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .ai-chat-avatar {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.95rem;
            flex-shrink: 0;
        }

        .ai-message .ai-chat-avatar {
            background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
        }

        .ai-chat-text {
            padding: 0.85rem 1.15rem;
            border-radius: 18px;
            font-size: 0.92rem;
            line-height: 1.45;
            word-wrap: break-word;
            max-width: 78%;
        }

        .ai-chat-input-container {
            display: flex;
            gap: 0.6rem;
            padding: 1rem 1.15rem;
            background: white;
            border-top: 1px solid #e2e8f0;
            border-radius: 0 0 24px 24px;
        }

        .ai-chat-input {
            flex: 1;
            border: 1.5px solid #e2e8f0;
            border-radius: 14px;
            padding: 0.8rem 1.1rem;
            font-size: 0.92rem;
            transition: all 0.25s;
            font-family: inherit;
            background: #f8fafc;
        }

        .ai-chat-input:focus {
            outline: none;
            border-color: #2563eb;
            background: white;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .ai-chat-send {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            border: none;
            border-radius: 14px;
            width: 44px;
            height: 44px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s;
            font-size: 1.05rem;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .ai-chat-send:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .ai-chat-send:active {
            transform: translateY(0);
        }

        /* Floating Toggle Button */
        .ai-chat-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1565c0 0%, #1976d2 100%);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 1.5rem;
            box-shadow: 0 4px 15px rgba(21, 101, 192, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            z-index: 9997;
        }

        .ai-chat-toggle:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(21, 101, 192, 0.5);
        }

        .ai-chat-toggle:active {
            transform: scale(0.95);
        }

        .ai-chat-toggle.hidden {
            display: none;
        }

        /* Loading indicator */
        .ai-loading {
            display: flex;
            gap: 0.3rem;
            align-items: center;
        }

        .ai-loading span {
            width: 8px;
            height: 8px;
            background: #1565c0;
            border-radius: 50%;
            animation: bounce 1.4s infinite;
        }

        .ai-loading span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .ai-loading span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
        }

        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Confirmation Buttons */
        .ai-confirmation-buttons {
            display: flex;
            gap: 0.75rem;
            margin-top: 0.5rem;
        }

        .ai-confirm-btn {
            flex: 1;
            padding: 0.75rem 1.25rem;
            border: none;
            border-radius: 14px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .ai-confirm-yes {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .ai-confirm-yes:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .ai-confirm-no {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .ai-confirm-no:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        .ai-confirm-btn:active {
            transform: translateY(0);
        }

        /* Responsive */
        @media (max-width: 480px) {
            .ai-chat-widget {
                width: calc(100% - 20px);
                height: 80vh;
                bottom: 70px;
            }

            .ai-chat-text {
                max-width: 85%;
            }
        }

        ::-webkit-scrollbar {
            width: 6px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: rgba(21, 101, 192, 0.3);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: rgba(21, 101, 192, 0.5);
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

/**
 * Toggle AI Chat widget visibility
 */
function toggleAIChat() {
    const widget = document.getElementById('ai-chat-widget');
    const toggle = document.getElementById('ai-chat-toggle');

    if (widget && toggle) {
        if (widget.style.display === 'none' || !widget.style.display) {
            widget.style.display = 'flex';
            toggle.classList.add('hidden');
        } else {
            widget.style.display = 'none';
            toggle.classList.remove('hidden');
        }
    }
}

/**
 * Close AI Chat
 */
function closeAIChat() {
    const toggle = document.getElementById('ai-chat-toggle');
    const widget = document.getElementById('ai-chat-widget');

    if (widget) widget.style.display = 'none';
    if (toggle) toggle.classList.remove('hidden');
}

/**
 * Handle Enter key in input
 */
function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendAIMessage();
    }
}

/**
 * Send message to AI Agent
 */
async function sendAIMessage() {
    const input = document.getElementById('ai-chat-input');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to UI
    addChatMessage(message, 'user');

    // Show loading indicator
    showLoadingIndicator();

    try {
        // Send to server with previously collected fields
        const response = await fetch(`${SERVER_URL}/ai/process-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                userId: getUserId(),
                conversationHistory: conversationHistory,
                language: currentLanguage,
                previousFields: window.complaintFormData || {} // Send previously collected fields
            }),
            credentials: 'include'
        });

        const data = await response.json();
        removeLoadingIndicator();

        if (!response.ok) {
            addChatMessage(data.message || translations[currentLanguage].error, 'ai');
            return;
        }

        // Log the response for debugging
        console.log('🤖 AI Response:', data);

        // Store in history
        conversationHistory.push({
            user: message,
            assistant: data.followUpQuestion || data.message || 'Processing...'
        });

        // Handle based on intent
        if (data.intent === 'REPORT_COMPLAINT') {
            handleComplaintReporting(data);
        } else if (data.intent === 'TRACK_COMPLAINT') {
            // Show user's complaints
            const trackMsg = data.message || translations[currentLanguage].trackComplaint;
            addChatMessage(trackMsg, 'ai');
            // TODO: Fetch and display user's complaints
        } else if (data.intent === 'ASSIGN_ISSUE') {
            handlePageNavigation(data);
        } else if (data.intent === 'VIEW_DASHBOARD') {
            handlePageNavigation(data);
        } else if (data.intent === 'HISTORY_REPORT') {
            handlePageNavigation(data);
        } else if (data.intent && data.intent.startsWith('REDIRECT_')) {
            handlePageNavigation(data);
        } else if (data.intent === 'GENERAL_QUERY') {
            // Handle general queries
            const responseMsg = data.message || data.response || translations[currentLanguage].error;
            addChatMessage(responseMsg, 'ai');
        } else {
            // Unknown intent - show message if available
            const fallbackMsg = data.message || data.followUpQuestion || translations[currentLanguage].error;
            addChatMessage(fallbackMsg, 'ai');
        }
    } catch (error) {
        removeLoadingIndicator();
        console.error('❌ Chat error:', error);
        addChatMessage(translations[currentLanguage].error, 'ai');
    }

    // Refocus input
    setTimeout(() => input.focus(), 100);
}

/**
 * Handle complaint reporting flow
 */
function handleComplaintReporting(data) {
    // If backend already auto-submitted the complaint autonomously
    if (data.autoSubmitted || data.action === 'autoSubmitted') {
        const successMsg = data.message || (currentLanguage === 'hi'
            ? `✅ आपकी शिकायत सफलतापूर्वक दर्ज कर ली गई है! (शिकायत आईडी: #${data.complaintId})। विभाग: ${data.department || 'संबंधित विभाग'}। फील्ड वर्कर (${data.workerName || 'असाइन किया गया'}) को कार्यभार सौंपा गया है।`
            : `✅ Complaint registered successfully! (ID: #${data.complaintId}). Department: ${data.department || 'Assigned'}. Field Specialist: ${data.workerName || 'Assigned Worker'}.`);

        addChatMessage(successMsg, 'ai');

        // Clear stored form data
        window.complaintFormData = {};

        // Trigger real-time dashboard refresh
        try {
            if (typeof loadComplaints === 'function') loadComplaints();
            if (typeof loadUserComplaints === 'function') loadUserComplaints();
            if (typeof fetchCitizenComplaints === 'function') fetchCitizenComplaints();
            if (typeof loadRecentComplaints === 'function') loadRecentComplaints();
        } catch (e) {
            console.log('Notice refreshing complaints on page:', e);
        }

        // Helpful follow-up prompt
        setTimeout(() => {
            const followUpMsg = currentLanguage === 'hi'
                ? 'क्या मैं आपकी और कोई सहायता कर सकता हूँ?'
                : 'Can I help you with anything else?';
            addChatMessage(followUpMsg, 'ai');
        }, 1200);
        return;
    }

    const { fields, missingFields, followUpQuestion, message } = data;

    // Store fields safely for later submission (preserve existing values)
    if (!window.complaintFormData) {
        window.complaintFormData = {};
    }
    if (fields && typeof fields === 'object') {
        Object.keys(fields).forEach(k => {
            const val = fields[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                window.complaintFormData[k] = val;
            }
        });
    }

    // Show AI response message
    if (message) {
        addChatMessage(message, 'ai');
    }

    // If there's a follow-up question, show it
    if (followUpQuestion) {
        setTimeout(() => {
            addChatMessage(followUpQuestion, 'ai');
        }, 500);
    }

    // If there are missing fields, continue conversation
    if (missingFields && missingFields.length > 0) {
        // Don't navigate - keep the conversation going
        console.log('⏳ Still missing fields:', missingFields);
        console.log('📝 Current form data:', window.complaintFormData);
        console.log('📊 Fields collected so far:', Object.keys(window.complaintFormData));
    } else {
        // All fields ready - AUTO SUBMIT (AI Agent does it automatically!)
        console.log('🎉 ALL FIELDS READY! Auto-submitting...');
        console.log('📦 Final form data:', window.complaintFormData);

        const submittingMsg = currentLanguage === 'hi'
            ? '✅ बढ़िया! मेरे पास सभी जानकारी है। मैं आपकी शिकायत दर्ज कर रहा हूँ...'
            : '✅ Perfect! I have all the information. Submitting your complaint now...';

        addChatMessage(submittingMsg, 'ai');

        // Auto-submit after a short delay
        setTimeout(() => {
            console.log('🚀 Calling submitComplaintFromChat()...');
            submitComplaintFromChat();
        }, 1000);
    }
}

/**
 * Add confirmation buttons for complaint submission
 */
function addConfirmationButtons() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    if (!messagesContainer) return;

    const buttonsHTML = `
        <div class="ai-chat-message ai-message">
            <div class="ai-chat-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-confirmation-buttons">
                <button class="ai-confirm-btn ai-confirm-yes" onclick="submitComplaintFromChat()">
                    <i class="fas fa-check"></i> ${currentLanguage === 'hi' ? 'हाँ, दर्ज करें' : 'Yes, Submit'}
                </button>
                <button class="ai-confirm-btn ai-confirm-no" onclick="cancelComplaintSubmission()">
                    <i class="fas fa-times"></i> ${currentLanguage === 'hi' ? 'नहीं, रद्द करें' : 'No, Cancel'}
                </button>
            </div>
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', buttonsHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Submit complaint from chat
 */
async function submitComplaintFromChat() {
    console.log('🚀 submitComplaintFromChat() called!');
    console.log('📦 Submitting data:', window.complaintFormData);

    // Remove confirmation buttons
    const buttons = document.querySelector('.ai-confirmation-buttons');
    if (buttons) {
        buttons.closest('.ai-chat-message').remove();
    }

    // Show submitting message
    const submittingMsg = currentLanguage === 'hi'
        ? '⏳ आपकी शिकायत दर्ज की जा रही है...'
        : '⏳ Submitting your complaint...';
    addChatMessage(submittingMsg, 'ai');

    try {
        // Submit complaint via API
        console.log('📡 Sending POST request to:', `${SERVER_URL}/api/chat/submit-complaint`);
        const response = await fetch(`${SERVER_URL}/api/chat/submit-complaint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(window.complaintFormData)
        });

        console.log('📨 Response status:', response.status);
        const result = await response.json();
        console.log('📨 Response data:', result);

        if (result.success) {
            const successMsg = currentLanguage === 'hi'
                ? `✅ शिकायत सफलतापूर्वक दर्ज की गई! शिकायत आईडी: ${result.complaintId}`
                : `✅ Complaint submitted successfully! Complaint ID: ${result.complaintId}`;
            addChatMessage(successMsg, 'ai');

            // Clear form data
            window.complaintFormData = {};

            // Ask if they want to do anything else
            setTimeout(() => {
                const followUpMsg = currentLanguage === 'hi'
                    ? 'क्या मैं आपकी और कोई मदद कर सकता हूँ?'
                    : 'Can I help you with anything else?';
                addChatMessage(followUpMsg, 'ai');
            }, 1000);
        } else {
            const errorMsg = currentLanguage === 'hi'
                ? `❌ शिकायत दर्ज करने में विफल: ${result.message}`
                : `❌ Failed to submit complaint: ${result.message}`;
            addChatMessage(errorMsg, 'ai');
        }
    } catch (error) {
        console.error('❌ Submission error:', error);
        const errorMsg = currentLanguage === 'hi'
            ? '❌ शिकायत दर्ज करने में त्रुटि हुई। कृपया फिर से प्रयास करें।'
            : '❌ Error submitting complaint. Please try again.';
        addChatMessage(errorMsg, 'ai');
    }
}

/**
 * Cancel complaint submission
 */
function cancelComplaintSubmission() {
    // Remove confirmation buttons
    const buttons = document.querySelector('.ai-confirmation-buttons');
    if (buttons) {
        buttons.closest('.ai-chat-message').remove();
    }

    // Clear form data
    window.complaintFormData = {};

    const cancelMsg = currentLanguage === 'hi'
        ? 'ठीक है, मैंने रद्द कर दिया। क्या मैं आपकी और कोई मदद कर सकता हूँ?'
        : 'Okay, I\'ve cancelled that. Can I help you with anything else?';
    addChatMessage(cancelMsg, 'ai');
}

/**
 * Handle page navigation
 */
function handlePageNavigation(data) {
    const { targetPage, message } = data;
    addChatMessage(message || `Taking you to ${targetPage}...`, 'ai');

    setTimeout(() => {
        window.location.href = targetPage;
    }, 1500);
}

/**
 * Navigate to form page and auto-fill
 */
function navigateToFormAndFill(targetPage, formData) {
    // Store data in sessionStorage for the form page to access
    sessionStorage.setItem('complaintFormData', JSON.stringify(formData));

    // Navigate
    window.location.href = targetPage;
}

/**
 * Add message to chat UI
 */
function addChatMessage(text, role) {
    const messagesContainer = document.getElementById('ai-chat-messages');
    if (!messagesContainer) return;

    const messageClass = role === 'user' ? 'user-message' : 'ai-message';
    const avatarIcon = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const messageHTML = `
        <div class="ai-chat-message ${messageClass}">
            ${role === 'ai' ? `<div class="ai-chat-avatar">${avatarIcon}</div>` : ''}
            <div class="ai-chat-text">${text}</div>
            ${role === 'user' ? `<div class="ai-chat-avatar">${avatarIcon}</div>` : ''}
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Show loading indicator
 */
function showLoadingIndicator() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    if (!messagesContainer) return;

    const loadingHTML = `
        <div id="ai-loading-indicator" class="ai-chat-message ai-message">
            <div class="ai-chat-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', loadingHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Remove loading indicator
 */
function removeLoadingIndicator() {
    const indicator = document.getElementById('ai-loading-indicator');
    if (indicator) indicator.remove();
}

/**
 * Get current user ID (from session/cookies)
 */
function getUserId() {
    // Extract from JWT or user data
    return document.cookie.split('; ').find(row => row.startsWith('userId='))?.split('=')[1] || 'anonymous';
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AI Chat widget
    initializeAIChat();

    // Auto-fill form if data exists in sessionStorage
    const formData = sessionStorage.getItem('complaintFormData');
    if (formData) {
        try {
            const data = JSON.parse(formData);
            autoFillComplaintForm(data);
            sessionStorage.removeItem('complaintFormData');
        } catch (e) {
            console.warn('Could not parse form data:', e);
        }
    }
});

/**
 * Auto-fill complaint form with extracted data
 */
function autoFillComplaintForm(formData) {
    console.log('🎯 Auto-filling form with:', formData);

    // Map form data to HTML elements
    Object.entries(formData).forEach(([key, value]) => {
        if (!value) return;

        // Try different selectors
        const selectors = [
            `#${key}`,
            `[name="${key}"]`,
            `[data-field="${key}"]`
        ];

        let element = null;
        for (const selector of selectors) {
            element = document.querySelector(selector);
            if (element) break;
        }

        if (element) {
            if (element.tagName === 'SELECT') {
                element.value = value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (element.tagName === 'TEXTAREA' || element.type === 'text') {
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });

    // Scroll to form
    const form = document.querySelector('form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
