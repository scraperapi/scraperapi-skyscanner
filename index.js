const axios = require('axios');
const cheerio = require('cheerio');
const dJSON = require('dirty-json');
const setCookie = require('set-cookie-parser');

const API_KEY = '2b47bf207cdd9c147b2bb69a779ec6d3';

(async () => {
  try {
    // Fetch our initial skyscanner page.
    const searchURL = 'https://www.skyscanner.co.il/transport/flights/tlv/bud/240206/240215/?adultsv2=1&cabinclass=economy&inboundaltsenabled=false&outboundaltsenabled=false&preferdirects=false&priceTrace=202311130445*D*TLV*BUD*20240206*mtil*W6%7C202311130445*D*BUD*TLV*20240215*mtil*W6&qp_prevCurrency=USD&qp_prevPrice=49&qp_prevProvider=ins_month&rtn=1';
    const searchResponse = await axios.get(`http://localhost:5001/?api_key=${API_KEY}&url=${encodeURIComponent(searchURL)}`);

    if (searchResponse.status === 200) {
      // Extract the internal data JSON string from the response.
      const internalRegex = /window\["__internal"\] = \{(?<internal>(.|\n)*?)\};/
      const internalMatch = internalRegex.exec(searchResponse.data);
      if (internalMatch.groups?.internal) {
        // Make the string valid JSON.
        const internalString = `{${internalMatch.groups.internal.replace(': undefined', ': null')}}`;
        const internal = dJSON.parse(internalString);

        // Construct the POST payload from data on the page.
        const payload = {
          "market": internal.culture.market, // This is most likely the TLD of the site we're scraping.
          "locale": internal.culture.locale, // Set for the locale of the response.
          "currency": internal.culture.currency, // Set for the currency of the response.
          "alternativeOrigins": false, // Looks like a default; experiment with other queries to find source when true.
          "alternativeDestinations": false, // Looks like a default; experiment with other queries to find source when true.
          "destination": internal.searchParams.destination,
          "adults": internal.searchParams.adultsV2,
          "cabin_class": internal.searchParams.cabinClass,
          "child_ages": internal.searchParams.childrenV2,
          "inboundDate": internal.searchParams.inboundDate,
          "options": {
              "include_unpriced_itineraries": internal.config.featuresDecisionValues.SHOW_UNPRICED_OPTION,
              "include_mixed_booking_options": internal.config.featuresDecisionValues.ENABLE_BOOKING_CALL // This may not be the correct source.
          },
          "origin": internal.searchParams.origin,
          "outboundDate": internal.searchParams.outboundDate,
          "prefer_directs": internal.searchParams.preferDirects,
          "state": {},
          "viewId": internal.viewId,
          "travellerContextId": internal.tagManagerProps.utid,
          "trusted_funnel_search_guid": internal.viewId,
          "legs": [ // This looks like it's an entry for the return trip.
              {
                  "origin": internal.searchParams.origin.id,
                  "destination": internal.searchParams.destination.id,
                  "date": internal.searchParams.outboundDate,
                  "return_date": internal.searchParams.inboundDate,
                  "add_alternative_origins": false, // Looks like a default; experiment with other queries to find source when true.
                  "add_alternative_destinations": false // Looks like a default; experiment with other queries to find source when true.
              }
          ]
        };

        const flightURL = 'https://www.skyscanner.co.il/g/conductor/v1/fps3/search/?geo_schema=skyscanner&carrier_schema=skyscanner&response_include=query%3Bdeeplink%3Bsegment%3Bstats%3Bfqs%3Bpqs';

        // Construct a reasonable set of headers, including relevant data from the search page.
        const flightHeaders = {
          'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
          'x-skyscanner-devicedetection-istablet': 'false',
          'x-skyscanner-channelid': 'website',
          'x-skyscanner-devicedetection-ismobile': 'false',
          'x-skyscanner-utid': internal.utid,
          'sec-ch-ua-mobile': '?0',
          'x-skyscanner-traveller-context': internal.utid,
          'content-type': 'application/json',
          'accept': 'application/json',
          'x-skyscanner-viewid': internal.viewId,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'sec-ch-ua-model': '""',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
          'referer': searchURL,
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8'
        };

        // Extract cookies from the search response and add them to the headers.
        const cookies = setCookie.parse(searchResponse.headers['set-cookie']);
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        flightHeaders.cookie = cookieString;

        // This is our first set of (minimal) data, displayed while the page loads and we see the "searching" message.
        const flightResponse = await axios.post(
          `http://localhost:5001/?api_key=${API_KEY}&force_headers=true&url=${encodeURIComponent(flightURL)}`,
          payload,
          { headers: flightHeaders }
        );

        // Now get the rest flight data.  Note that the web page executes this 3 times, so it may be loading
        // additional data - experimentation recommended.
        const flightDataURL = `https://www.skyscanner.co.il/g/conductor/v1/fps3/search/${flightResponse.data.context.session_id}?geo_schema=skyscanner&carrier_schema=skyscanner&response_include=query%3Bdeeplink%3Bsegment%3Bstats%3Bfqs%3Bpqs`;
        const flightDataResponse = await axios.post(
          `http://localhost:5001/?api_key=${API_KEY}&force_headers=true&url=${encodeURIComponent(flightDataURL)}`,
          payload,
          { headers: flightHeaders }
        );

        // You can now extract flight data from the responses.  It's in JSON format so directly accessible.
        console.log(flightDataResponse.data);
      }      
    }

    // Extract the data we need to form POST requests for the remaining data.

  } catch (err) {
    console.error(err);
  }
})();
