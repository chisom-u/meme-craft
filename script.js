// Get references to all relevant DOM elements
const imageInput = document.getElementById('imageInput');

const addTextInput = document.getElementById('addTextInput'); 
const addTextBtn = document.getElementById('addTextBtn'); 
const deleteTextBtn = document.getElementById('deleteTextBtn'); 

const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d'); 
const textColor = document.getElementById('textColor');
const fontSelect = document.getElementById('fontSelect');
const textSize = document.getElementById('textSize');
const randomMemeBtn = document.getElementById('randomMemeBtn');


let image = new Image(); // Image object to store the uploaded image

let texts = []; // Array of text objects { text, x, y }
let selectedTextIndex = -1; // Currently selected text (-1 if none)

// Initial positions for the top and bottom text
let topTextPos = { x: canvas.width / 2, y: 50 };
let bottomTextPos = { x: canvas.width / 2, y: canvas.height - 60 };

// Track dragging state
let dragging = false;
let dragTarget = null; // 'top' or 'bottom'

// Get mouse position relative to the canvas element
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect(); // Get canvas position on screen
    return {
        x: evt.clientX - rect.left,  // Mouse X relative to canvas
        y: evt.clientY - rect.top    // Mouse Y relative to canvas
    };
}

// Check if mouse click is near a given text position
function isNear(mouse, textPos) {
    const buffer = 30; // How close the mouse needs to be to detect selection
    return (
        mouse.x > textPos.x - buffer &&
        mouse.x < textPos.x + buffer &&
        mouse.y > textPos.y - buffer &&
        mouse.y < textPos.y + buffer
    );
}

// === Handle image upload, only allow jpeg, png, gif ===
imageInput.addEventListener('change', () => {
    const file = imageInput.files[0]; // Get selected file

    // Check file type to allow only jpeg, png, or gif
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a JPEG, PNG, or GIF image.');
        imageInput.value = ''; // Reset input
        return;
    }

    const reader = new FileReader();  // Create FileReader to read image

    reader.onload = function () {
        image.src = reader.result; // Set image source to uploaded file content
    };

    reader.readAsDataURL(file); // Read file as base64 URL
});


// When the image finishes loading, draw the meme
image.onload = () => {
    drawMeme();
    canvas.classList.add('show'); // Add class to trigger animation
};

// When the "Generate Meme" button is clicked, draw the meme
generateBtn.addEventListener('click', drawMeme);

// When the "Random Meme Template" button is clicked, add random meme
randomMemeBtn.addEventListener('click', fetchRandomMeme);


// When the "Download Meme" button is clicked
downloadBtn.addEventListener('click', () => {
    drawMeme();
    canvas.classList.add('show');
    const link = document.createElement('a'); // Create a temporary download link
    link.download = 'meme.png';               // Set the default download filename
    link.href = canvas.toDataURL();           // Get the image data from the canvas
    link.click();                             // Simulate a click to trigger the download
});

// Function to draw the meme on the canvas
function drawMeme() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the uploaded image to cover the entire canvas
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Set text styles for the meme text
    ctx.fillStyle = textColor.value;   // Text color
    ctx.strokeStyle = 'black';         // Outline color for better readability
    ctx.lineWidth = 1;                 // Outline thickness
    ctx.textAlign = 'center';          // Center the text horizontally
    ctx.font = `${textSize.value}px ${fontSelect.value}`;     // Size from slider, font from dropdown

    // Draw all added texts
    texts.forEach((txt, index) => {
        ctx.fillStyle = textColor.value;  // Fill color for the text using the selected text color
        ctx.strokeStyle = 'black';        // Outline color for the text for better readability
        ctx.lineWidth = 1;                // Thickness outline
        ctx.textAlign = 'center';         // Center align text horizontally
        ctx.font = `${textSize.value}px ${fontSelect.value}`; // Font and size based on user selection

        // Text wrapping functionality at the specified (x, y) position
        wrapText(ctx, txt.text.toUpperCase(), txt.x, txt.y, canvas.width - 40, textSize.value);

        // Highlight selected text with rectangle
        if (index === selectedTextIndex) {
            const textWidth = ctx.measureText(txt.text.toUpperCase()).width;
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
              
            ctx.strokeRect(
                txt.x - textWidth / 2 - 10,       // X position: left edge of text minus padding,
                txt.y - textSize.value / 2 - 15,  // Y position: top edge of text minus padding,
                textWidth + 10,                   // Width: text width plus horizontal padding
                textSize.value);                  // Height: font size plus vertical padding
        }
    });
}

// Function to retrieve random meme from API and add to template
function fetchRandomMeme() {
    // Fetch meme from Imgflip API
    fetch('https://api.imgflip.com/get_memes')
        .then(response => response.json())                                 // Convert response to JSON
        .then(data => {
            const memes = data.data.memes;                                 // Get array of meme templates
            const randomIndex = Math.floor(Math.random() * memes.length);  // Pick a random one
            image.crossOrigin = "anonymous";                               // Avoid CORS issues
            image.src = memes[randomIndex].url;                            // Set the image source to the random meme
        })
        .catch(err => console.error('Error fetching meme:', err));         // Handle errors
}

// === Add new text to canvas when "Add Text" button is clicked ===
addTextBtn.addEventListener('click', () => {
    // Prevent adding empty text
    if (addTextInput.value.trim() === '') return;

    // Add new text object to texts array with default centered position
    texts.push({
        text: addTextInput.value,         // The actual text content
        x: canvas.width / 2,              // Start at center X of canvas
        y: canvas.height / 2              // Start at center Y of canvas
    });

    selectedTextIndex = texts.length - 1; // Automatically select the newly added text
    addTextInput.value = '';              // Clear the input box
    drawMeme();                          // Redraw the canvas to show new text
});

// === Delete currently selected text when "Delete" button is clicked ===
deleteTextBtn.addEventListener('click', () => {
    // If no text is selected, do nothing
    if (selectedTextIndex === -1) return;

    texts.splice(selectedTextIndex, 1);  // Remove the selected text from array
    selectedTextIndex = -1;              // Reset selection
    drawMeme();                          // Redraw the canvas without the deleted text
});

// === Function to wrap text across multiple lines if needed ===
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');   // Break text into individual words
    let line = '';                   // Current line being built
    let lines = [];                  // Array to hold completed lines

    // Loop through all words and build lines within maxWidth
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine); // Measure text width
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
            lines.push(line);        // Save completed line
            line = words[n] + ' ';   // Start new line
        } else {
            line = testLine;         // Continue building current line
        }
    }
    lines.push(line);                // Add the final line

    // Optional vertical centering adjustment
    const totalHeight = lines.length * lineHeight;
    y -= (totalHeight / 2) - (lineHeight / 2);

    // Draw each line of text at calculated position
    for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], x, y + (i * lineHeight));
        context.strokeText(lines[i], x, y + (i * lineHeight));
    }
}

// === Listen for mouse press on canvas to select and drag text ===
canvas.addEventListener('mousedown', (e) => {
    const mousePos = getMousePos(e); // Get mouse position relative to canvas
    selectedTextIndex = -1;          // Reset selection

    // Check if mouse clicked near any text
    texts.forEach((txt, index) => {
        const textWidth = ctx.measureText(txt.text.toUpperCase()).width;

        // Simple hit detection based on text bounding box
        if (
            mousePos.x > txt.x - textWidth / 2 - 17 &&
            mousePos.x < txt.x + textWidth / 2 + 17 &&
            mousePos.y > txt.y - textSize.value / 2 - 17 &&
            mousePos.y < txt.y + textSize.value / 2 + 17
        ) {
            selectedTextIndex = index; // Mark this text as selected
            dragging = true;           // Enable dragging mode
        }
    });

    drawMeme(); // Redraw to show selection highlight
});


// Listen for mouse movement on the canvas
canvas.addEventListener('mousemove', (e) => {
    if (!dragging) return; // Only move text if currently dragging

    const mousePos = getMousePos(e); // Get updated mouse position

    texts[selectedTextIndex].x = mousePos.x;
    texts[selectedTextIndex].y = mousePos.y;
    
    drawMeme(); // Redraw canvas with updated text position
});

// Stop dragging when mouse button is released
canvas.addEventListener('mouseup', () => {
    dragging = false;
    dragTarget = null; // Clear target
});

// Stop dragging if mouse leaves the canvas area
canvas.addEventListener('mouseleave', () => {
    dragging = false;
    dragTarget = null;
});

// Touch start - same as mousedown
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

// Touch move - same as mousemove
canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

// Touch end - same as mouseup
canvas.addEventListener('touchend', () => {
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
});






