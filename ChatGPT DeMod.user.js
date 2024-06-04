// ==UserScript==
// @name         ChatGPT DeMod
// @namespace    com.gwolf0719.chatgpt
// @version      1.0
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
        return text.replace(/\"flagged\": ?true/ig, "\"flagged\": false")
                   .replace(/\"blocked\": ?true/ig, "\"blocked\": false");
    }

    // 攔截 fetch 請求
    const original_fetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options] = args;
        const is_conversation = url.includes('/complete') || (url.includes('/conversation') && !url.includes('/conversations'));

        if (is_conversation && options && options.body) {
            const payload = JSON.parse(options.body);
            payload.supports_modapi = false;
            options.body = JSON.stringify(payload);
        }

        const original_response = await original_fetch(...args);

        if (is_conversation) {
            const response_clone = original_response.clone();
            const response_text = await response_clone.text();
            const cleaned_response_text = clearFlagging(response_text);

            return new Response(cleaned_response_text, {
                status: original_response.status,
                statusText: original_response.statusText,
                headers: original_response.headers
            });
        }

        return original_response;
    };
})();
