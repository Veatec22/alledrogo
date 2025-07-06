document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing popup.js...');
    const monthlyEarningsInput = document.getElementById('monthlyEarnings');
    const saveButton = document.getElementById('saveEarnings');
    const statusParagraph = document.getElementById('status');
    const toggleAdvancedSettingsButton = document.getElementById('toggleAdvancedSettings');
    const advancedSettingsDiv = document.getElementById('advancedSettings');
    const hoursPerDayInput = document.getElementById('hoursPerDay');
    const daysPerWeekInput = document.getElementById('daysPerWeek');
    const advancedSettingsContainer = document.getElementById('advancedSettingsContainer');
    const pluginEnabledToggle = document.getElementById('pluginEnabledToggle');
    const mainControls = document.getElementById('mainControls');

    let initialState = {};

    function toggleMainControls(enabled) {
        if (enabled) {
            mainControls.classList.remove('disabled');
        } else {
            mainControls.classList.add('disabled');
        }
    }

    function getCurrentState() {
        return {
            monthlyEarnings: parseFloat(monthlyEarningsInput.value) || 0,
            hoursPerDay: parseInt(hoursPerDayInput.value) || 0,
            daysPerWeek: parseInt(daysPerWeekInput.value) || 0,
            isAdvancedSettingsOpen: advancedSettingsDiv.style.display === 'block',
            pluginEnabled: pluginEnabledToggle.checked
        };
    }

    function checkForChanges() {
        const currentState = getCurrentState();
        let hasChanged = false;

        if (currentState.monthlyEarnings !== initialState.monthlyEarnings) hasChanged = true;
        if (currentState.hoursPerDay !== initialState.hoursPerDay) hasChanged = true;
        if (currentState.daysPerWeek !== initialState.daysPerWeek) hasChanged = true;
        if (currentState.pluginEnabled !== initialState.pluginEnabled) hasChanged = true;

        console.log('checkForChanges called:');
        console.log('  currentState:', currentState);
        console.log('  initialState:', initialState);
        console.log('  hasChanged:', hasChanged);

        saveButton.style.display = hasChanged ? 'block' : 'none';
        if (!hasChanged) {
            statusParagraph.textContent = '';
        }
    }
    
    function updateUIVisibility() {
        checkForChanges();
    }

    chrome.storage.sync.get(['monthlyEarnings', 'isAdvancedSettingsOpen', 'hoursPerDay', 'daysPerWeek', 'pluginEnabled'], (data) => {
        console.log('Data loaded from storage:', data);
        const loadedData = {
            monthlyEarnings: data.monthlyEarnings || 10000,
            hoursPerDay: data.hoursPerDay || 8,
            daysPerWeek: data.daysPerWeek || 5,
            isAdvancedSettingsOpen: data.isAdvancedSettingsOpen || false,
            pluginEnabled: data.pluginEnabled !== false,
        };

        pluginEnabledToggle.checked = loadedData.pluginEnabled;
        monthlyEarningsInput.value = loadedData.monthlyEarnings;
        hoursPerDayInput.value = loadedData.hoursPerDay;
        daysPerWeekInput.value = loadedData.daysPerWeek;


        advancedSettingsDiv.style.display = loadedData.isAdvancedSettingsOpen ? 'block' : 'none';

        console.log('Setting initialState...');
        initialState = getCurrentState();
        console.log('initialState set to:', initialState);

        toggleMainControls(loadedData.pluginEnabled);
        updateUIVisibility();

        const inputs = [monthlyEarningsInput, hoursPerDayInput, daysPerWeekInput];
        inputs.forEach(input => input.addEventListener('input', checkForChanges));
    });

    pluginEnabledToggle.addEventListener('change', () => {
        const isEnabled = pluginEnabledToggle.checked;
        chrome.storage.sync.set({ pluginEnabled: isEnabled }, () => {
            toggleMainControls(isEnabled);

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('allegro.pl')) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        });
    });

    saveButton.addEventListener('click', () => {
        const currentState = getCurrentState();

        if (isNaN(currentState.monthlyEarnings) || currentState.monthlyEarnings <= 0) {
            statusParagraph.textContent = 'Proszę wprowadzić poprawne miesięczne zarobki.';
            statusParagraph.style.color = 'red';
            return;
        }

        if (isNaN(currentState.hoursPerDay) || currentState.hoursPerDay <= 0 ||
            isNaN(currentState.daysPerWeek) || currentState.daysPerWeek <= 0) {
            statusParagraph.textContent = 'Proszę wprowadzić poprawne wartości dla konfiguracji zaawansowanej.';
            statusParagraph.style.color = 'red';
            return;
        }

        chrome.storage.sync.set(currentState, () => {
            initialState = currentState;
            statusParagraph.textContent = 'Zapisano!';
            statusParagraph.style.color = 'green';
            saveButton.style.display = 'none';

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('allegro.pl')) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        });
    });

    toggleAdvancedSettingsButton.addEventListener('click', () => {
        const isVisible = advancedSettingsDiv.style.display === 'block';
        advancedSettingsDiv.style.display = isVisible ? 'none' : 'block';
        checkForChanges();
    });
});