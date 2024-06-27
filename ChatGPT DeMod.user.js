// ==UserScript==
// @name         ChatGPT DeMod James
// @namespace    com.gwolf0719.chatgpt
// @version      1.15
// @description  Hides moderation results during conversations with ChatGPT
// @author       gwolf0719
// @match        *://chatgpt.com/*
// @match        *://chat.openai.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @downloadURL  https://github.com/gwolf0719/chatgpt-demod/raw/main/ChatGPT%20DeMod.user.js
// @updateURL    https://github.com/gwolf0719/chatgpt-demod/raw/main/ChatGPT%20DeMod.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

'use strict';

(function() {
    // 清除標記
    function clearFlagging(text) {
        let cleanedText = text.replace(/"flagged": ?true/ig, '"flagged": false')
                              .replace(/"blocked": ?true/ig, '"blocked": false');
        return cleanedText;
    }

    // 清理新的對話節點
    function cleanNewMessages() {
        console.log('開始清理新消息');
        const userMessages = document.querySelectorAll('div[data-message-author-role="user"]');
        const assistantMessages = document.querySelectorAll('div[data-message-author-role="assistant"]');

        userMessages.forEach(message => {
            const text = message.innerHTML;
            const cleanedText = clearFlagging(text);
            if (text !== cleanedText) {
                message.innerHTML = cleanedText;
            }
        });

        assistantMessages.forEach(message => {
            const text = message.innerHTML;
            const cleanedText = clearFlagging(text);
            if (text !== cleanedText) {
                message.innerHTML = cleanedText;
            }
        });
    }

    // 初始化監控 DOM 變化
    function initMutationObserver() {
        const targetNode = document.querySelector('body');
        const config = { childList: true, subtree: true };

        const callback = (mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.matches('div[data-message-id]')) {
                            const text = node.innerHTML;
                            const cleanedText = clearFlagging(text);
                            if (text !== cleanedText) {
                                node.innerHTML = cleanedText;
                            }
                        }
                    });
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // 在頁面載入時進行初次清理並啟動監控
    window.addEventListener('load', () => {
        cleanNewMessages();
        initMutationObserver();
    });

    // 攔截 fetch 請求
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options] = args;
        const isConversation = url.includes('/complete') || (url.includes('/conversation') && !url.includes('/conversations'));

        if (isConversation && options && options.body) {
            const payload = JSON.parse(options.body);
            payload.supports_modapi = false;
            options.body = JSON.stringify(payload);
        }

        const originalResponse = await originalFetch(...args);

        if (isConversation) {
            const responseClone = originalResponse.clone();
            const responseText = await responseClone.text();
            const cleanedResponseText = clearFlagging(responseText);

            return new Response(cleanedResponseText, {
                status: originalResponse.status,
                statusText: originalResponse.statusText,
                headers: originalResponse.headers
            });
        }

        return originalResponse;
    };

    // 攔截 WebSocket 消息
    const originalWebSocket = window.WebSocket;
    window.WebSocket = new Proxy(originalWebSocket, {
        construct(target, args) {
            const ws = new target(...args);

            ws.addEventListener('message', event => {
                const data = event.data;
                if (data && typeof data === 'string') {
                    const cleanedData = clearFlagging(data);
                    event.stopImmediatePropagation();
                    const newEvent = new MessageEvent('message', {
                        data: cleanedData,
                        origin: event.origin,
                        lastEventId: event.lastEventId,
                        source: event.source,
                        ports: event.ports
                    });
                    ws.dispatchEvent(newEvent);
                }
            });

            return ws;
        }
    });

})();
