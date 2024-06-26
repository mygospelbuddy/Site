async function fetchData() {
    try {
        const response = await fetch("https://kameronyork.com/datasets/general-conference-talks.json");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

let currentSearchWords = []; // Global variable to store the current search terms
const colors = ['#FF0000', '#0000FF', '#00FF00', '#FF00FF', '#00FFFF', '#FFFF00']; // Global colors array

async function searchAndDisplay() {
    const searchInput = document.getElementById("wordInput").value.trim().toLowerCase();
    if (searchInput === "") {
        clearSearch(); // Clear the search input and reset the plot
        currentSearchWords = []; // Reset the stored search words
        return; // Abort the search
    }

    // Parse the input for "||" operator and parentheses
    currentSearchWords = searchInput.split(/\s+(?=\()/).map(group => {
        if (group.includes('||')) {
            return group.replace(/[()]/g, '').split('||').map(term => term.trim());
        } else {
            return [group.replace(/[()]/g, '').trim()];
        }
    });

    try {
        const data = await fetchData();
        if (!data) throw new Error("No data returned from fetch");

        const byConference = document.getElementById("conferenceToggle").checked;
        const tableMode = document.getElementById("tableModeToggle").checked;
        const per1000Words = document.getElementById("per1000Words").checked;
        let allCounts = {};
        let yearLookup = {};

        currentSearchWords.forEach(group => {
            group.forEach(searchWord => {
                let counts = {};
                data.forEach(row => {
                    const text = row['text'].toLowerCase();
                    const wordCount = text.split(/\s+/).length; // Total number of words in the talk
                    const year = row['year'];
                    const month = row['month'];
                    const conferenceId = row['conference-id'];

                    const regex = new RegExp(`\\b${searchWord}\\b`, 'gi');
                    const matches = text.match(regex);
                    let count = matches ? matches.length : 0;

                    if (per1000Words) {
                        count = (count / wordCount) * 1000; // Normalize by 1000 words
                        count = Math.round(count * 10) / 10; // Round to nearest 1 decimal point
                    }

                    const key = byConference ? `${month} ${year}` : year.toString();
                    if (!counts[key]) counts[key] = 0;
                    counts[key] += count;

                    if (!yearLookup[key]) {
                        yearLookup[key] = byConference ? `${month} ${year}` : year;
                    }
                });
                allCounts[searchWord] = counts;
            });
        });

        let combinedCounts = combineCounts(allCounts, currentSearchWords);

        if (tableMode) {
            drawTable(combinedCounts, yearLookup, byConference);
            updateLegend([]);  // Clear legend when in table mode
        } else {
            drawScatterPlot(combinedCounts, yearLookup, byConference);
            updateLegend(currentSearchWords);  // Restore legend when switching back to scatter plot mode
        }
        document.getElementById("tableContainer").innerHTML = "<p></p>";  // Clear the table content
    } catch (error) {
        console.error("Error during search and display:", error);
    }
}

function combineCounts(allCounts, searchGroups) {
    let combinedCounts = {};
    searchGroups.forEach(group => {
        let groupKey = group.join(' || ');
        combinedCounts[groupKey] = {};
        group.forEach(term => {
            Object.keys(allCounts[term]).forEach(year => {
                if (!combinedCounts[groupKey][year]) {
                    combinedCounts[groupKey][year] = 0;
                }
                combinedCounts[groupKey][year] += allCounts[term][year];
            });
        });
    });
    return combinedCounts;
}


function getPointSize() {
    const screenWidth = window.innerWidth;

    if (screenWidth <= 100) { 
        return 1;
    } else if (screenWidth <= 300) { 
        return 2;
    } else if (screenWidth <= 500) { 
        return 3;
    } else { 
        return 5;
    }
}


function drawScatterPlot(allCounts, yearLookup, byConference) {
    const plotContainer = document.getElementById('plotContainer');
    plotContainer.innerHTML = ''; // Clear existing content

    // Create a new canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'plotCanvas';
    plotContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

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

    let maxCount = 0;
    let allKeys = new Set();
    Object.values(allCounts).forEach(counts => {
        maxCount = Math.max(maxCount, ...Object.values(counts));
        Object.keys(counts).forEach(key => allKeys.add(key));
    });
    allKeys = Array.from(allKeys).sort((a, b) => a - b);

    const xScale = plotWidth / (allKeys.length - 1);
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
    const labelSpacingX = determineLabelSpacing(allKeys.length);
    ctx.textAlign = 'center';
    ctx.beginPath();
    ctx.moveTo(margin.left, canvas.height - margin.bottom);
    ctx.lineTo(canvas.width - margin.right, canvas.height - margin.bottom);
    ctx.stroke();
    allKeys.forEach((key, index) => {
        if (index % labelSpacingX === 0) {
            ctx.fillText(yearLookup[key], margin.left + index * xScale, canvas.height - margin.bottom + 20);
        }
    });

    let points = [];
    const pointSize = getPointSize(); // Calculate the point size based on screen width

    currentSearchWords.forEach((group, groupIdx) => {
        const groupKey = group.join(' || ');
        ctx.fillStyle = colors[groupIdx % colors.length];
        const counts = allCounts[groupKey];

        allKeys.forEach((key, index) => {
            if (counts[key] !== 0) {
                const x = margin.left + index * xScale;
                const y = canvas.height - margin.bottom - (counts[key] * yScale);
                ctx.beginPath();
                ctx.arc(x, y, pointSize, 0, 2 * Math.PI); // Use the dynamic point size
                ctx.fill();

                // Store the center, radius, and key for each point
                points.push({
                    centerX: x,
                    centerY: y,
                    radius: pointSize, // Use the dynamic point size
                    key: key,
                    searchGroup: groupKey
                });
            }
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
                displayTalksTable(point.key, point.searchGroup, byConference); // Use the stored key and searchGroup
                console.log(`Scatter point clicked: Key = ${point.key}, Search Group = ${point.searchGroup}`);
            }
        });
    });
}


function drawTable(allCounts, yearLookup, byConference) {
    const per1000Words = document.getElementById("per1000Words").checked;
    const tableContainer = document.getElementById('plotContainer');
    tableContainer.innerHTML = ''; // Clear existing content

    // Create the table container div with dynamic height and border
    const tableDiv = document.createElement('div');
    tableDiv.style.width = '100%';
    tableDiv.style.border = '1px solid black';
    tableDiv.style.overflow = 'auto';
    tableDiv.style.backgroundColor = 'white';
    tableContainer.appendChild(tableDiv);

    let tableHTML = '<table style="width: 100%; border-collapse: collapse; font-size: 10pt;">';
    tableHTML += `<tr style="background-color: #f8f8f8;"><th style="padding: 5px;">${byConference ? 'Conference' : 'Year'}</th>`;
    currentSearchWords.forEach(group => {
        const groupKey = group.join(' || ');
        tableHTML += `<th style="padding: 5px;">${groupKey}</th>`;
    });
    tableHTML += '</tr>';

    let allKeys = new Set();
    Object.values(allCounts).forEach(counts => {
        Object.keys(counts).forEach(key => allKeys.add(key));
    });
    allKeys = Array.from(allKeys).sort((a, b) => a - b);

    allKeys.forEach(key => {
        tableHTML += `<tr data-key="${key}" style="background-color: white; padding: 2px 0;">`;
        tableHTML += `<td style="padding: 5px;">${yearLookup[key]}</td>`;
        currentSearchWords.forEach(group => {
            const groupKey = group.join(' || ');
            let displayCount = allCounts[groupKey][key] || 0;
            if (per1000Words) {
                displayCount = displayCount.toFixed(1); // Ensure one decimal point
            }
            tableHTML += `<td class="clickable-cell" style="padding: 5px; background-color: #FFF5E6;">${displayCount}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</table>';
    tableDiv.innerHTML = tableHTML;

    // Adjust table container height dynamically based on the table content
    const tableHeight = tableDiv.querySelector('table').offsetHeight;
    const maxHeight = tableContainer.offsetWidth * 0.75; // 4:3 aspect ratio

    tableDiv.style.height = tableHeight > maxHeight ? `${maxHeight}px` : `${tableHeight}px`;

    const cells = tableDiv.querySelectorAll('.clickable-cell');
    cells.forEach(cell => {
        cell.addEventListener('click', function () {
            const row = cell.parentElement;
            const key = row.getAttribute('data-key');
            const cellIndex = Array.prototype.indexOf.call(row.children, cell) - 1; // Subtract 1 to account for the year/month column
            const searchGroup = currentSearchWords[cellIndex].join(' || ');
            displayTalksTable(key, searchGroup, byConference);
        });
    });
}


function updateLegend(searchWords) {
    const legendContainer = document.getElementById('legendContainer');
    legendContainer.innerHTML = ''; // Clear existing legend content

    if (searchWords.length > 0) {
        // Create the legend box
        const legendBox = document.createElement('div');
        legendBox.style.border = '1px solid black';
        legendBox.style.backgroundColor = 'white';
        legendBox.style.padding = '10px';
        legendBox.style.display = 'inline-block';

        searchWords.forEach((group, groupIdx) => {
            const groupKey = group.join(' || ');
            group.forEach((term, idx) => {
                const legendItem = document.createElement('div');
                legendItem.style.display = 'flex';
                legendItem.style.alignItems = 'center';
                legendItem.style.marginBottom = '5px';

                const colorBox = document.createElement('div');
                colorBox.style.width = '12px';
                colorBox.style.height = '12px';
                colorBox.style.backgroundColor = colors[groupIdx % colors.length];
                colorBox.style.marginRight = '10px';

                const legendText = document.createElement('span');
                legendText.style.fontSize = '8pt';
                legendText.style.color = 'black';
                legendText.innerText = term;

                if (idx > 0) {
                    colorBox.style.backgroundColor = 'transparent'; // Transparent for subsequent terms
                }

                legendItem.appendChild(colorBox);
                legendItem.appendChild(legendText);
                legendBox.appendChild(legendItem);
            });

            // Add a light gray horizontal line after each group except the last one
            if (groupIdx < searchWords.length - 1) {
                const separator = document.createElement('div');
                separator.style.width = '100%';
                separator.style.height = '1px';
                separator.style.backgroundColor = '#d3d3d3';
                separator.style.margin = '5px 0';
                legendBox.appendChild(separator);
            }
        });

        legendContainer.appendChild(legendBox);
        
        // Add breaks outside the legend border
        const br1 = document.createElement('br');
        const br2 = document.createElement('br');
        legendContainer.appendChild(br1);
        legendContainer.appendChild(br2);
    }
}

async function displayTalksTable(key, searchGroup, byConference) {
    try {
        const data = await fetchData();
        if (!data) throw new Error("No data returned from fetch");

        let filteredData = [];

        const terms = searchGroup.split(' || ');

        if (byConference) {
            filteredData = data.filter(talk => {
                const matches = terms.some(term => {
                    const regex = new RegExp(`\\b${term}\\b`, 'gi');
                    return regex.test(talk.text);
                });
                if (matches && `${talk.month} ${talk.year}` === key) {
                    talk.count = terms.reduce((acc, term) => {
                        const regex = new RegExp(`\\b${term}\\b`, 'gi');
                        const termMatches = talk.text.match(regex);
                        return acc + (termMatches ? termMatches.length : 0);
                    }, 0);
                    return true;
                }
                return false;
            });
        } else {
            filteredData = data.filter(talk => {
                const matches = terms.some(term => {
                    const regex = new RegExp(`\\b${term}\\b`, 'gi');
                    return regex.test(talk.text);
                });
                if (matches && talk.year.toString() === key) {
                    talk.count = terms.reduce((acc, term) => {
                        const regex = new RegExp(`\\b${term}\\b`, 'gi');
                        const termMatches = talk.text.match(regex);
                        return acc + (termMatches ? termMatches.length : 0);
                    }, 0);
                    return true;
                }
                return false;
            });
        }

        generateTalksTable(filteredData);
    } catch (error) {
        console.error("Error displaying talks table:", error);
    }
}

function generateTalksTable(talks) {
    let tableHTML = `<table style="width: 100%; margin: auto; border-collapse: collapse; font-size: 10pt;">`;
    tableHTML += '<tr><th>#</th><th>Year</th><th>Month</th><th>Speaker</th><th>Talk</th></tr>';

    const maxCount = Math.max(...talks.map(talk => talk.count));

    talks.sort((a, b) => b['talk-id'] - a['talk-id']).forEach(talk => {
        const percentWidth = (talk.count / maxCount) * 100;

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

    tableHTML += '</table><br><br>';
    document.getElementById("tableContainer").innerHTML = tableHTML;
}

function clearSearch() {
    document.getElementById("wordInput").value = '';
    drawScatterPlot({}, {}, false);
    document.getElementById("tableContainer").innerHTML = "<p></p>";

    const legendContainer = document.getElementById('legendContainer');
    legendContainer.innerHTML = ''; // Clear the legend content
    legendContainer.style.border = '';
    legendContainer.style.backgroundColor = '';
    legendContainer.style.padding = '';
}

document.addEventListener("DOMContentLoaded", function() {
  const per1000WordsRadio = document.getElementById("per1000Words");
  const perTalkRadio = document.getElementById("perTalk");

  // Ensure mutual exclusivity
  per1000WordsRadio.addEventListener("change", function() {
    if (per1000WordsRadio.checked) {
      perTalkRadio.checked = false;
      console.log("check changed");
      searchAndDisplay();
    }
  });

  perTalkRadio.addEventListener("change", function() {
    if (perTalkRadio.checked) {
      per1000WordsRadio.checked = false;
      console.log("check changed");
      searchAndDisplay();
    }
  });

  // Other existing event listeners...
  const inputField = document.getElementById("wordInput");
  inputField.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchAndDisplay();
    }
  });
  document.getElementById("conferenceToggle").addEventListener("change", searchAndDisplay);
  document.getElementById("tableModeToggle").addEventListener("change", searchAndDisplay);
  drawScatterPlot({}, {}, false);

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
