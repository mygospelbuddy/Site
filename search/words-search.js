async function fetchData() {
    const response = await fetch("https://kameronyork.com/datasets/general-conference-talks.csv");
    const data = await response.text();
    return Papa.parse(data, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    }).data;
}

let currentSearchWord = ''; // Global variable to store the current search term

async function searchAndDisplay() {
    const searchWord = document.getElementById("wordInput").value.trim().toLowerCase();
    if (searchWord === "") {
        clearSearch(); // Clear the search input and reset the plot
        currentSearchWord = ''; // Reset the stored search word
        return; // Abort the search
    }
    currentSearchWord = searchWord; // Update the global variable
    const data = await fetchData();
    const byConference = document.getElementById("conferenceToggle").checked;
    let counts = {};
    let yearLookup = {};

    data.forEach(row => {
        const text = row['text'].toLowerCase();
        const year = row['year'];
        const conferenceId = row['conference-id'];

        const regex = new RegExp(`\\b${searchWord}\\b`, 'gi');
        const matches = text.match(regex);
        const count = matches ? matches.length : 0;

        const key = byConference ? conferenceId : year.toString();
        if (!counts[key]) counts[key] = 0;
        counts[key] += count;

        if (!yearLookup[key]) {
            yearLookup[key] = year;
        }
    });

    drawScatterPlot(counts, yearLookup, byConference);
    document.getElementById("tableContainer").innerHTML = "<p></p>";  // Clear the table content
}



function drawScatterPlot(counts, yearLookup, byConference) {
    const canvas = document.getElementById('plotCanvas');
    const ctx = canvas.getContext('2d');
    const keys = Object.keys(counts).sort((a, b) => a - b);
    const maxCount = Math.max(...Object.values(counts));

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.width * (3 / 4);  // Maintain a 4:3 aspect ratio

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const plotWidth = canvas.width - margin.left - margin.right;
    const plotHeight = canvas.height - margin.top - margin.bottom;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

    const xScale = plotWidth / (keys.length - 1);
    const yScale = plotHeight / maxCount;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, canvas.height - margin.bottom);
    ctx.stroke();

    // Y-axis labels
    const labelSpacingY = determineLabelSpacing(maxCount);
    ctx.fillStyle = 'black';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= maxCount; i += labelSpacingY) {
        const y = canvas.height - margin.bottom - (i * yScale);
        ctx.fillText(i, margin.left - 10, y);
    }

    // X-axis and labels
    const labelSpacingX = determineLabelSpacing(keys.length);
    ctx.textAlign = 'center';
    ctx.beginPath();
    ctx.moveTo(margin.left, canvas.height - margin.bottom);
    ctx.lineTo(canvas.width - margin.right, canvas.height - margin.bottom);
    ctx.stroke();
    keys.forEach((key, index) => {
        if (index % labelSpacingX === 0) {
            const x = margin.left + index * xScale;
            ctx.fillText(yearLookup[key], x, canvas.height - margin.bottom + 20);
        }
    });

    // Draw and store points for click detection
    let points = [];  // Array to store circle centers and radius for click detection
    ctx.fillStyle = '#FF0000';
    keys.forEach((key, index) => {
        const x = margin.left + index * xScale;
        const y = canvas.height - margin.bottom - (counts[key] * yScale);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // Store the center, radius, and key for each point
        points.push({
            centerX: x,
            centerY: y,
            radius: 5,
            key: key  // Key is already set correctly based on the toggle state during data processing
        });
    });

    // Event listener for clicks
    canvas.addEventListener('click', function(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        points.forEach(point => {
            const distance = Math.sqrt((point.centerX - mouseX) ** 2 + (point.centerY - mouseY) ** 2);
            if (distance < point.radius) {
                displayTalksTable(point.key, byConference); // Use the stored key
                console.log(`Scatter point clicked: Key = ${point.key}, Count = ${counts[point.key]}`);
            }
        });
    });
}

async function displayTalksTable(key, byConference) {
    const data = await fetchData();
    let filteredData = [];

    if (byConference) {
        // Filter by conference ID and count occurrences of the search word
        filteredData = data.filter(talk => {
            const regex = new RegExp(`\\b${currentSearchWord}\\b`, 'gi');
            const matches = talk.text.match(regex);
            if (matches && talk['conference-id'].toString() === key) {
                talk.count = matches.length;
                return true;
            }
            return false;
        });
    } else {
        // Filter by year and count occurrences of the search word
        filteredData = data.filter(talk => {
            const regex = new RegExp(`\\b${currentSearchWord}\\b`, 'gi');
            const matches = talk.text.match(regex);
            if (matches && talk.year.toString() === key) {
                talk.count = matches.length;
                return true;
            }
            return false;
        });
    }

    generateTalksTable(filteredData);
}



function generateTalksTable(talks) {
    let tableHTML = `<table style="width: 100%; margin: auto; border-collapse: collapse; font-size: 10pt;">`; // Set font size here
    tableHTML += '<tr><th>#</th><th>Year</th><th>Month</th><th>Speaker</th><th>Talk</th></tr>';

    // Find the maximum count to set the 100% width for databars
    const maxCount = Math.max(...talks.map(talk => talk.count));

    talks.sort((a, b) => b['talk-id'] - a['talk-id']).forEach(talk => {
        const percentWidth = (talk.count / maxCount) * 100; // Calculate the percentage width of the databar

        tableHTML += `<tr>
            <td style="text-align: center; position: relative;">
                <div style="background-color: #F39C12; width: ${percentWidth}%; height: 100%; position: absolute; left: 0; top: 0;"></div>
                <div style="position: relative; z-index: 1;">${talk.count}</div>
            </td>
            <td>${talk.year}</td>
            <td>${talk.month}</td>
            <td>${talk.speaker}</td>
            <td><a href="${talk.hyperlink}" target="_blank">${talk.title}</a></td>
        </tr>`;
    });

    tableHTML += '</table>';
    document.getElementById("tableContainer").innerHTML = tableHTML; // Ensure there's a div with id "tableContainer" in your HTML
}






function clearSearch() {
    document.getElementById("wordInput").value = '';
    drawScatterPlot({}, {}, false);
    document.getElementById("tableContainer").innerHTML = "<p></p>";  // Clear the table content

}




document.addEventListener("DOMContentLoaded", function() {
    const inputField = document.getElementById("wordInput");
    inputField.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent the default form submission
            searchAndDisplay(); // Trigger search and display
        }
    });
    document.getElementById("conferenceToggle").addEventListener("change", searchAndDisplay);
    drawScatterPlot({}, {}, false); // Initialize a blank plot area

    document.getElementById("clearButton").addEventListener("click", clearSearch);
});



function determineLabelSpacing(count) {
    if (count <= 10) {
        return 1;
    } else if (count <= 20) {
        return 2;
    } else if (count <= 50) {
        return 5;
    } else if (count <= 100) {
        return 10;
    } else if (count <= 500) {
        return 50;
    } else {
        return 100;
    }
}
