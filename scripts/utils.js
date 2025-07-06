
function convertPrice(pricePLN, monthlyEarnings, hoursPerDay = 8, daysPerWeek = 5, conversionMode, kebabPrice) {
    if (!monthlyEarnings || monthlyEarnings <= 0) {
      return null;
    }

    if (conversionMode === 'kebab') {
      if (!kebabPrice || kebabPrice <= 0) {
        return null;
      }
      const numberOfKebabs = pricePLN / kebabPrice;
      let formattedKebabs;
      if (numberOfKebabs < 1) {
        formattedKebabs = '<1 kebaba';
      } else if (numberOfKebabs === 1) {
        formattedKebabs = '1 kebab';
      } else if (numberOfKebabs > 1 && numberOfKebabs < 5) {
        formattedKebabs = `${numberOfKebabs.toFixed(1).replace('.0', '')} kebaby`;
      } else {
        formattedKebabs = `${numberOfKebabs.toFixed(1).replace('.0', '')} kebabów`;
      }
      return formattedKebabs;
    }

    const BASE_HOURS_PER_DAY = 8;
    const BASE_DAYS_PER_WEEK = 5;
    const baseTotalHoursPerMonth = BASE_HOURS_PER_DAY * BASE_DAYS_PER_WEEK * 4;
    const baseHourlyEarnings = monthlyEarnings / baseTotalHoursPerMonth;

    let result = null;
    let unit = '';

    const totalHoursToEarn = pricePLN / baseHourlyEarnings;
    const totalMinutesToEarn = totalHoursToEarn * 60;

    if (pricePLN <= 0) {
        return null;
    }

    const minutesPerWorkDay = hoursPerDay * 60;

    if (totalMinutesToEarn < 60) {
        result = totalMinutesToEarn.toFixed(0);
        unit = 'min.';
        if (parseFloat(result) === 0 && pricePLN > 0) {
            result = '<1';
        }
    } else {
        const wholeDays = Math.floor(totalMinutesToEarn / minutesPerWorkDay);
        let remainingMinutesAfterDays = totalMinutesToEarn % minutesPerWorkDay;

        const wholeHours = Math.floor(remainingMinutesAfterDays / 60);
        const finalMinutes = Math.round(remainingMinutesAfterDays % 60);

        let parts = [];
        if (wholeDays > 0) {
            parts.push(`${wholeDays} dni`);
        }
        if (wholeHours > 0) {
            parts.push(`${wholeHours} godz.`);
        }
        if (finalMinutes > 0) {
            parts.push(`${finalMinutes} min.`);
        }

        if (parts.length === 0) {
            result = '<1 min.';
        } else {
            result = parts.join(' i ');
        }
        unit = '';
    }

    if (result !== null && unit !== '') {
        return `${result} ${unit}`;
    }
    return result;
  }
  
  function cleanPriceText(text) {
    return text.replace(/cena/g, '')
               .replace(/zł/g, '')
               .replace(/\s/g, '')
               .replace(',', '.');
  }