import "./dashboard.scss";
import template from "./dashboard.html";

import "../../../images/hero-bg1.jpg";
import "../../../images/wlm-logo.png";
import pack from "../../../../package.json";

const DashboardComponent = { controller, template };

function controller(
  $filter,
  $mdToast,
  $state,
  $window,
  WikiService,
  langService,
  mapService,
  wikidata
) {
  const vm = this;
  const langs = langService.getUserLanguages();

  vm.getImage = getImage;
  vm.lang = {};
  vm.languagesList = langService.getLanguagesList();
  vm.languages = langService.getUserLanguages();
  vm.loading = false;
  vm.saveUserLanguages = saveUserLanguages;
  vm.searchLang = (text) => $filter("filter")(vm.languagesList, text);
  vm.setLanguage = (lang) => {
    vm.languages.push(lang.code);
  };

  vm.getMatches = getMatches;
  vm.goToMap = goToMap;

  init();

  function init() {
    $window.document.title = "Dashboard – Wiki Loves Monuments Map";

    vm.config = {
      env: $window.__env,
      package: pack,
    };

    // getNearestMonuments();

    // Count the number of the countries
    updateCountryCount();
  }

  /**
   * Count the number of the countries
   */
  function updateCountryCount() {
    const countryElements = document.querySelectorAll(".countriesList h4");
    const numberOfCountries = countryElements.length;

    document.getElementById(
      "numberOfCountries"
    ).textContent = `Number of countries : ${numberOfCountries}`;
  }

  /*
  function getMatches(input) {
    if (!input) {
        return null;
    }

    return mapService
        .getCity(input)
        .then(data => {
            const matches = data.data
                .filter(item => item.class !== 'boundary')
                .map((item) => {
                    const name = item.display_name.split(', ')[0];
                    return {
                        name,
                        details: item.display_name.substring(name.length + 1),
                        lat: item.lat,
                        lon: item.lon,
                    };
                });

            if (matches.length === 1) {
                // redirect to the town 
                const selectedLocation = matches[0];
                const lat = parseFloat(selectedLocation.lat).toFixed(4);
                const lon = parseFloat(selectedLocation.lon).toFixed(4);
                const c = `${lat}:${lon}:17`;
                console.log(c)
                console.log(`Redirecting to main.map with c=${c}`);
                $state.go('main.map', { c });
            }

            return matches;
        });
  }
  */

  // Melissa code 
  /**
   * Get value of the input (city)
   * @param {*} input 
   * @returns 
   */
  function getMatches(input) {
    if (!input) {
        return []; 
    }
    // Wikidata id for the cities
    const cityIds = {
        'paris': 'Q90',
        'rome': 'Q220',
        'new york': 'Q60'
    };

    const cityId = cityIds[input.toLowerCase()];
    
    // If the city_id exists 
    if (cityId) {
        return getMonuments(cityId);
    } else {
        document.getElementById('monuments-list').innerHTML = "<li>Aucun monument trouvé pour cette ville.</li>";
    }
  }
  
  /**
   * Get the 3 first monuments for the city (input)
   * @param {*} cityId 
   */
  function getMonuments(cityId) {
    const sparqlEndpoint = 'https://query.wikidata.org/sparql';
  
    const query = `
      SELECT ?monument ?monumentLabel ?description WHERE {
        ?monument wdt:P31 wd:Q4989906;    # Monuments
                  wdt:P131 wd:${cityId};  # Filtre par ville
        OPTIONAL { ?monument schema:description ?description. FILTER (LANG(?description) = "fr") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],fr,en,de,es". }
      }
      LIMIT 3`; 

    const url = `${sparqlEndpoint}?query=${encodeURIComponent(query)}`;

    fetch(url, {
        headers: { 'Accept': 'application/sparql-results+json' }
    })
    .then(response => response.json())
    .then(data => {
      // SPARQL data 
      console.log("Données de la requête SPARQL : ", data); 

      if (data.results.bindings && data.results.bindings.length > 0) {
        const results = data.results.bindings.map(item => {
          const monumentLabel = item.monumentLabel ? item.monumentLabel.value : `Identifiant : ${item.monument.value.split('/').pop()}`;
          const description = item.description ? item.description.value : "";
          return { 
            name: monumentLabel,
            description: description
          };
        });

        const listContainer = document.getElementById('monuments-list');
        listContainer.innerHTML = "";  

        results.forEach(monument => {
          const card = document.createElement('div');
          card.classList.add('monument-card');

          const toggleButton = document.createElement('button');
          toggleButton.innerHTML = "Voir plus";
        
          const cardHeader = document.createElement('div');
          cardHeader.classList.add('monument-card-header');
          cardHeader.innerHTML = `<strong>${monument.name}</strong>`;
          cardHeader.appendChild(toggleButton);
        
          const cardDescription = document.createElement('div');
          cardDescription.classList.add('monument-description');
          cardDescription.innerHTML = `<p>${monument.description}</p>`;
        
          toggleButton.onclick = () => {
            if (cardDescription.style.display === 'none') {
              cardDescription.style.display = 'block';
              toggleButton.innerHTML = "Voir moins";
            } else {
              cardDescription.style.display = 'none';
              toggleButton.innerHTML = "Voir plus";
            }
      };
    
      card.appendChild(cardHeader);
      card.appendChild(cardDescription);
      const listContainer = document.getElementById('monuments-list');
      listContainer.appendChild(card);
    });
    
  } else {
      document.getElementById('monuments-list').innerHTML = "<li>Aucun monument trouvé.</li>";
  }
})

    .catch(error => {
      console.error('Erreur lors de la récupération des données SPARQL :', error);
      document.getElementById('monuments-list').innerHTML = "<li>Erreur lors de la récupération des données</li>";
    });
  }

  // fin 

  function goToMap() {
    const lat = parseFloat(vm.selectedItem.lat).toFixed(4);
    const lon = parseFloat(vm.selectedItem.lon).toFixed(4);
    const c = `${lat}:${lon}:15`;
    $state.go("main.map", { c });
  }

  function geolocSuccess(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const request =
      wikidata.getSPARQL(`SELECT ?place ?placeLabel ?dist (SAMPLE(?image) AS ?image)
      WHERE
      {
        SERVICE wikibase:around {
            ?place wdt:P625 ?location .
            bd:serviceParam wikibase:center "Point(${longitude} ${latitude})"^^geo:wktLiteral .
            bd:serviceParam wikibase:radius "10" .
        }
        ?place wdt:P1435 ?monument .
        OPTIONAL { ?place wdt:P18 ?image . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${langs
          .map((lang) => lang.code)
          .join(",")}" }
        BIND(geof:distance("Point(${longitude} ${latitude})"^^geo:wktLiteral, ?location) as ?dist) 
      }
      GROUP BY ?place ?placeLabel ?dist
      ORDER BY ?dist`);
    request.then((data) => {
      vm.nearby = data.slice(0, 15).map((item) => ({
        id: item.place.value.substring(32),
        name: item.placeLabel.value,
        imageName: item.image ? item.image.value.substring(51) : undefined,
        distance: item.dist.value,
      }));
    });
  }

  function getImage(item) {
    if (!item.imageName) {
      return;
    }
    WikiService.getImage(decodeURIComponent(item.imageName), {
      iiurlwidth: 640,
    }).then((response) => {
      item.image = response.imageinfo;
    });
  }

  function getNearestMonuments() {
    navigator.geolocation.getCurrentPosition(geolocSuccess, () => {
      vm.nearby = "error";
    });
  }

  function saveUserLanguages() {
    langService.setUserLanguages(vm.languages).then(() => {
      $mdToast.show(
        $mdToast.simple().textContent("Languages saved!").hideDelay(3000)
      );
      $state.reload();
    });
  }
}

export default () => {
  angular.module("monumental").component("moDashboard", DashboardComponent);
};
