//script.js

// document.addEventListener("DOMContentLoaded", function() {
//     const form = document.querySelector("form");

//     form.addEventListener("submit", function(event) {
//         const prompt = document.getElementById("prompt");
//         const numAsks = document.getElementById("numAsks");
//         const output = document.getElementById("output");

//         // Check if the prompt is empty
//         if (prompt.value.trim() === '') {
//             event.preventDefault();
//             alert('Please enter a prompt.');
//         }

//         // Check if numAsks is a valid number
//         if (isNaN(numAsks.value) || numAsks.value <= 0) {
//             event.preventDefault();
//             alert('Please enter a valid number of asks.');
//         }

//         // Add your request code here. I'm assuming it's an async function that returns a Promise.
//         // Replace with your actual function for making the request.
//         makeRequestToServer(prompt.value, numAsks.value)
//             .then(response => {
//                 // append response to output container
//                 output.innerText += response + '\n';
//             })
//             .catch(err => {
//                 // handle error
//                 output.innerText += 'Error: ' + err.message + '\n';
//             });
//     });
// });

document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("form");

    form.addEventListener("submit", function(event) {
        const prompt = document.getElementById("prompt");
        const numAsks = document.getElementById("numAsks");
        const output = document.getElementById("output");

        // Check if the prompt is empty
        if (prompt.value.trim() === '') {
            event.preventDefault();
            alert('Please enter a prompt.');
            return;
        }

        // Check if numAsks is a valid number
        if (isNaN(numAsks.value) || numAsks.value <= 0) {
            event.preventDefault();
            alert('Please enter a valid number of asks.');
            return;
        }

        event.preventDefault(); // Add this line to prevent the default form submission.

        // Make the request
        makeRequestToServer(prompt.value, numAsks.value)
            .then(data => {
                // append gptOutput and finalAnswer to output container
                output.innerText += 'GPT Output: ' + data.gptOutput + '\n';
                output.innerText += 'Final Answer: ' + data.finalAnswer + '\n';
            })
            .catch(err => {
                // handle error
                output.innerText += 'Error: ' + err.message + '\n';
            });
    });
});
function makeRequestToServer(prompt, numAsks) {
    const data = { prompt, numAsks };
    return fetch('/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            return Promise.reject(new Error(data.error));
        }
        // Return both gptOutput and finalAnswer
        return { gptOutput: data.gptOutput, finalAnswer: data.finalAnswer };
    });
}

