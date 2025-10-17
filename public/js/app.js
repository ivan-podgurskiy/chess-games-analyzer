// Chess.com Games Analyzer - Frontend JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const analyzeForm = document.getElementById('analyzeForm');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressMessage = document.getElementById('progressMessage');
    const fullResults = document.getElementById('fullResults');

    // Full Analysis Handler
    analyzeForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const limit = parseInt(document.getElementById('limit').value);
        const timeAvailable = parseInt(document.getElementById('time').value);

        if (!username) {
            alert('Please enter a Chess.com username');
            return;
        }

        startFullAnalysis(username, limit, timeAvailable);
    });

    function startFullAnalysis(username, limit, timeAvailable) {
        // Hide previous results
        fullResults.style.display = 'none';
        progressSection.style.display = 'block';

        // Reset progress (message will be updated by server events)
        updateProgress(0, 'Connecting...');

        // Use fetch with streaming to process events as they arrive
        fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, limit, timeAvailable })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            function processStream() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        return;
                    }

                    // Decode the chunk and add to buffer
                    buffer += decoder.decode(value, { stream: true });

                    // Process complete events (separated by \n\n)
                    const events = buffer.split('\n\n');
                    // Keep the last incomplete event in the buffer
                    buffer = events.pop() || '';

                    events.forEach(eventText => {
                        if (!eventText.trim()) return;

                        const lines = eventText.split('\n');
                        let eventType = 'message';
                        let data = '';

                        lines.forEach(line => {
                            if (line.startsWith('event: ')) {
                                eventType = line.substring(7);
                            } else if (line.startsWith('data: ')) {
                                data = line.substring(6);
                            }
                        });

                        if (data) {
                            try {
                                const eventData = JSON.parse(data);
                                handleAnalysisEvent(eventType, eventData);
                            } catch (e) {
                                console.error('Error parsing event data:', e);
                            }
                        }
                    });

                    // Continue reading
                    return processStream();
                });
            }

            return processStream();
        })
        .catch(error => {
            console.error('Analysis error:', error);
            updateProgress(0, 'Analysis failed. Please try again.');
            setTimeout(() => {
                progressSection.style.display = 'none';
            }, 3000);
        });
    }

    function handleAnalysisEvent(eventType, data) {
        switch (eventType) {
            case 'status':
                updateProgress(data.progress || 0, data.message);
                break;
            case 'result':
                updateProgress(100, 'Complete!');
                setTimeout(() => {
                    displayFullResults(data);
                }, 500);
                break;
            case 'error':
                updateProgress(0, `Error: ${data.message}`);
                setTimeout(() => {
                    progressSection.style.display = 'none';
                }, 3000);
                break;
        }
    }

    function updateProgress(percentage, message) {
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', percentage);
        progressMessage.textContent = message;

        if (percentage === 100) {
            progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
            progressBar.classList.add('bg-success');
        }
    }

    function displayFullResults(data) {
        const { profile, recommendations, studyPlan, aiSummary } = data;

        console.log('📊 Profile data received:', profile);
        console.log('🎨 Avatar data:', profile.avatar);

        // Player Profile
        document.getElementById('profileUsername').textContent = profile.username;
        document.getElementById('profileGames').textContent = profile.totalGames;
        document.getElementById('profileWinRate').textContent = (profile.winRate * 100).toFixed(1) + '%';
        document.getElementById('profileAccuracy').textContent = profile.averageAccuracy.toFixed(1) + '%';

        // Display Avatar
        if (profile.avatar) {
            console.log('✅ Displaying avatar');
            displayPlayerAvatar(profile.avatar);
        } else {
            console.log('❌ No avatar data found in profile');
        }

        // Display AI Summary Section
        if (aiSummary) {
            displayAISummary(aiSummary);
        }

        // Strengths
        const strengthsList = document.getElementById('strengthsList');
        strengthsList.innerHTML = '';
        if (profile.strengths && profile.strengths.length > 0) {
            profile.strengths.forEach(strength => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-check-circle-fill text-success me-2"></i>${strength}`;
                li.className = 'mb-2';
                strengthsList.appendChild(li);
            });
        } else {
            strengthsList.innerHTML = '<li class="text-muted">Analysis in progress...</li>';
        }

        // Mistakes
        const mistakesList = document.getElementById('mistakesList');
        mistakesList.innerHTML = '';
        if (profile.mistakePatterns && profile.mistakePatterns.length > 0) {
            profile.mistakePatterns.slice(0, 5).forEach(pattern => {
                const li = document.createElement('li');
                const severityIcon = pattern.severity === 'major' ? '🔴' :
                                   pattern.severity === 'moderate' ? '🟡' : '🟢';
                li.innerHTML = `<span class="me-2">${severityIcon}</span>${pattern.description} <small class="text-muted">(${pattern.frequency} games)</small>`;
                li.className = 'mb-2';
                mistakesList.appendChild(li);
            });
        } else {
            mistakesList.innerHTML = '<li class="text-muted">No significant patterns found</li>';
        }

        // Recommendations
        const recommendationsList = document.getElementById('recommendationsList');
        recommendationsList.innerHTML = '';
        if (recommendations && recommendations.length > 0) {
            recommendations.forEach((rec, index) => {
                const li = document.createElement('li');
                li.className = 'list-group-item border-0 px-0';
                li.innerHTML = `<i class="bi bi-arrow-right-circle me-2 text-primary"></i>${rec}`;
                recommendationsList.appendChild(li);
            });
        }

        // Study Plans
        const dailyPlan = document.getElementById('dailyPlan');
        dailyPlan.innerHTML = '';
        if (studyPlan.daily) {
            studyPlan.daily.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-calendar-day me-2 text-primary"></i>${item}`;
                li.className = 'mb-2';
                dailyPlan.appendChild(li);
            });
        }

        const weeklyPlan = document.getElementById('weeklyPlan');
        weeklyPlan.innerHTML = '';
        if (studyPlan.weekly) {
            studyPlan.weekly.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-calendar-week me-2 text-secondary"></i>${item}`;
                li.className = 'mb-2';
                weeklyPlan.appendChild(li);
            });
        }

        // Study Resources
        const studyResources = document.getElementById('studyResources');
        studyResources.innerHTML = '';
        if (profile.improvementAreas && profile.improvementAreas.length > 0) {
            const topArea = profile.improvementAreas[0];
            const categoryDiv = document.createElement('div');
            categoryDiv.innerHTML = `<strong class="text-warning">${topArea.category}:</strong>`;
            studyResources.appendChild(categoryDiv);

            const resourcesList = document.createElement('ul');
            resourcesList.className = 'list-unstyled mt-2';
            topArea.studyResources.slice(0, 3).forEach(resource => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-book me-2"></i><small>${resource}</small>`;
                li.className = 'mb-1';
                resourcesList.appendChild(li);
            });
            studyResources.appendChild(resourcesList);
        }

        // Show results and hide progress
        progressSection.style.display = 'none';
        fullResults.style.display = 'block';

        // Smooth scroll to results
        fullResults.scrollIntoView({ behavior: 'smooth' });
    }

    function displayAISummary(aiSummary) {
        const aiSummarySection = document.getElementById('aiSummarySection');
        
        // Summary text
        const summaryText = document.getElementById('aiSummaryText');
        summaryText.textContent = aiSummary.summary || 'AI analysis completed.';

        // Key Moments
        const keyMomentsSection = document.getElementById('keyMomentsSection');
        const keyMomentsList = document.getElementById('keyMomentsList');
        keyMomentsList.innerHTML = '';
        if (aiSummary.keyMoments && aiSummary.keyMoments.length > 0) {
            aiSummary.keyMoments.forEach(moment => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-star-fill text-warning me-2"></i>${moment}`;
                li.className = 'mb-2';
                keyMomentsList.appendChild(li);
            });
            keyMomentsSection.style.display = 'block';
        } else {
            keyMomentsSection.style.display = 'none';
        }

        // AI Strengths
        const aiStrengthsList = document.getElementById('aiStrengthsList');
        aiStrengthsList.innerHTML = '';
        if (aiSummary.strengths && aiSummary.strengths.length > 0) {
            aiSummary.strengths.forEach(strength => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-check-circle-fill text-success me-2"></i>${strength}`;
                li.className = 'mb-2';
                aiStrengthsList.appendChild(li);
            });
        } else {
            aiStrengthsList.innerHTML = '<li class="text-muted">Analysis in progress...</li>';
        }

        // AI Weaknesses
        const aiWeaknessesList = document.getElementById('aiWeaknessesList');
        aiWeaknessesList.innerHTML = '';
        if (aiSummary.weaknesses && aiSummary.weaknesses.length > 0) {
            aiSummary.weaknesses.forEach(weakness => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-exclamation-circle-fill text-warning me-2"></i>${weakness}`;
                li.className = 'mb-2';
                aiWeaknessesList.appendChild(li);
            });
        } else {
            aiWeaknessesList.innerHTML = '<li class="text-muted">No major issues found</li>';
        }

        // AI Advice
        const aiAdviceSection = document.getElementById('aiAdviceSection');
        const aiAdviceList = document.getElementById('aiAdviceList');
        if (aiSummary.advice && aiSummary.advice.length > 0) {
            aiAdviceList.innerHTML = '<ul class="mb-0">' +
                aiSummary.advice.map(advice => `<li class="mb-1">${advice}</li>`).join('') +
                '</ul>';
            aiAdviceSection.style.display = 'block';
        } else {
            aiAdviceSection.style.display = 'none';
        }

        // Improvement Plan
        const aiImmediatePlan = document.getElementById('aiImmediatePlan');
        aiImmediatePlan.innerHTML = '';
        if (aiSummary.improvementPlan && aiSummary.improvementPlan.immediate) {
            aiSummary.improvementPlan.immediate.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-arrow-right-circle me-2 text-success"></i>${item}`;
                li.className = 'mb-2';
                aiImmediatePlan.appendChild(li);
            });
        }

        const aiShortTermPlan = document.getElementById('aiShortTermPlan');
        aiShortTermPlan.innerHTML = '';
        if (aiSummary.improvementPlan && aiSummary.improvementPlan.shortTerm) {
            aiSummary.improvementPlan.shortTerm.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-arrow-right-circle me-2 text-info"></i>${item}`;
                li.className = 'mb-2';
                aiShortTermPlan.appendChild(li);
            });
        }

        const aiLongTermPlan = document.getElementById('aiLongTermPlan');
        aiLongTermPlan.innerHTML = '';
        if (aiSummary.improvementPlan && aiSummary.improvementPlan.longTerm) {
            aiSummary.improvementPlan.longTerm.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-arrow-right-circle me-2 text-primary"></i>${item}`;
                li.className = 'mb-2';
                aiLongTermPlan.appendChild(li);
            });
        }

        // Common Patterns
        const commonPatternsSection = document.getElementById('commonPatternsSection');
        const commonPatternsList = document.getElementById('commonPatternsList');
        commonPatternsList.innerHTML = '';
        if (aiSummary.commonPatterns && aiSummary.commonPatterns.length > 0) {
            aiSummary.commonPatterns.forEach(pattern => {
                const patternCard = document.createElement('div');
                patternCard.className = 'alert alert-danger mb-2';
                patternCard.innerHTML = `
                    <h6 class="alert-heading">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>${pattern.pattern}
                        <span class="badge bg-danger float-end">${pattern.frequency}× times</span>
                    </h6>
                    <p class="mb-0 small">${pattern.description}</p>
                `;
                commonPatternsList.appendChild(patternCard);
            });
            commonPatternsSection.style.display = 'block';
        } else {
            commonPatternsSection.style.display = 'none';
        }

        // Mistake Examples
        const mistakeExamplesSection = document.getElementById('mistakeExamplesSection');
        const mistakeExamplesBody = document.getElementById('mistakeExamplesBody');
        mistakeExamplesBody.innerHTML = '';
        if (aiSummary.mistakeExamples && aiSummary.mistakeExamples.length > 0) {
            aiSummary.mistakeExamples.forEach(example => {
                const row = document.createElement('tr');
                const typeColor = {
                    'blunder': 'danger',
                    'mistake': 'warning',
                    'inaccuracy': 'info'
                };
                const color = typeColor[example.type] || 'secondary';
                
                row.innerHTML = `
                    <td><strong>${example.moveNumber}</strong></td>
                    <td><code class="text-danger">${example.move}</code></td>
                    <td><span class="badge bg-${color}">${example.type}</span></td>
                    <td><code class="text-success">${example.betterMove}</code></td>
                    <td class="small">${example.explanation}</td>
                    <td class="small text-muted">${example.pattern || '-'}</td>
                `;
                mistakeExamplesBody.appendChild(row);
            });
            mistakeExamplesSection.style.display = 'block';
        } else {
            mistakeExamplesSection.style.display = 'none';
        }

        // Show the AI Summary section
        aiSummarySection.style.display = 'block';
    }

    function displayPlayerAvatar(avatar) {
        console.log('🖼️ displayPlayerAvatar called with:', avatar);
        
        const avatarSection = document.getElementById('avatarSection');
        const avatarDivider = document.getElementById('avatarDivider');
        
        // Set AI-generated avatar as main image
        const avatarImg = document.getElementById('playerAvatar');
        console.log('🎨 Setting avatar URL:', avatar.generatedAvatarUrl);
        avatarImg.src = avatar.generatedAvatarUrl;
        avatarImg.onerror = function() {
            console.error('❌ Failed to load avatar image');
            this.src = 'https://via.placeholder.com/150?text=♟️';
        };

        // Set Chess.com avatar as small badge icon
        const chessComIcon = document.getElementById('chessComIcon');
        if (avatar.chessComAvatarIcon) {
            chessComIcon.src = avatar.chessComAvatarIcon;
            chessComIcon.style.display = 'block';
        } else {
            chessComIcon.style.display = 'none';
        }

        // Set archetype info
        document.getElementById('archetypeTitle').textContent = avatar.archetype;
        document.getElementById('archetypeDescription').textContent = avatar.archetypeDescription;
        document.getElementById('visualDescription').textContent = avatar.visualDescription || '';

        // Display personality traits
        const traitsContainer = document.getElementById('personalityTraits');
        traitsContainer.innerHTML = '';
        if (avatar.personalityTraits && avatar.personalityTraits.length > 0) {
            avatar.personalityTraits.forEach(trait => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-light text-dark me-2';
                badge.textContent = trait;
                traitsContainer.appendChild(badge);
            });
        }

        // Display badges
        const badgesContainer = document.getElementById('avatarBadges');
        badgesContainer.innerHTML = '';
        if (avatar.badges && avatar.badges.length > 0) {
            avatar.badges.forEach(badge => {
                const badgeElement = document.createElement('div');
                badgeElement.className = `badge bg-${badge.color} p-2`;
                badgeElement.style.fontSize = '0.9rem';
                badgeElement.setAttribute('data-bs-toggle', 'tooltip');
                badgeElement.setAttribute('title', badge.description);
                badgeElement.innerHTML = `${badge.icon} ${badge.label}`;
                badgesContainer.appendChild(badgeElement);
            });

            // Initialize Bootstrap tooltips
            if (typeof bootstrap !== 'undefined') {
                const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
                [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
            }
        }

        // Show avatar section
        avatarSection.style.display = 'block';
        avatarDivider.style.display = 'block';
    }
});