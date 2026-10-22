
const API_KEY = "7b416787";
const API_URL = "https://www.omdbapi.com/";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const sortFilter = document.getElementById("sortFilter");
const showingFor = document.getElementById("showingFor");
const resultCount = document.getElementById("resultCount");
const loading = document.getElementById("loading");
const movieGrid = document.getElementById("movieGrid");
const emptyState = document.getElementById("emptyState");

let movies = [];
let totalResults = 0;
let requestId = 0;
let currentQuery = "Marvel";

async function searchMovies(query) {
  query = query.trim();

  if (!query) return;

  currentQuery = query;
  const thisRequest = ++requestId;

  showingFor.textContent = `Showing for: ${query}`;
  resultCount.textContent = "";
  movieGrid.innerHTML = "";
  emptyState.hidden = true;
  loading.hidden = false;

  try {
    // OMDb returns up to 10 results per page.
    // Request two pages to get up to 20 movies.
    const pages = [1, 2];

    const responses = await Promise.all(
      pages.map(page => {
        const params = new URLSearchParams({
          apikey: API_KEY,
          s: query,
          page: String(page)
        });

        return fetch(`${API_URL}?${params}`).then(response => {
          if (!response.ok) {
            throw new Error("The movie request failed.");
          }

          return response.json();
        });
      })
    );

    // Ignore results from an older search.
    if (thisRequest !== requestId) return;

    const [firstPage, secondPage] = responses;

    if (firstPage.Response === "False") {
      movies = [];
      totalResults = 0;
    } else {
      movies = [
        ...(firstPage.Search || []),
        ...(secondPage.Response === "True"
          ? secondPage.Search || []
          : [])
      ].slice(0, 20);

      totalResults = Number(
        firstPage.totalResults || movies.length
      );
    }

    displayMovies();
  } catch (error) {
    if (thisRequest !== requestId) return;

    movieGrid.innerHTML = "";
    movieGrid.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent =
      "Could not load movies. Check your connection and try again.";

    resultCount.textContent = "";
  } finally {
    if (thisRequest === requestId) {
      loading.hidden = true;
    }
  }
}

function displayMovies() {
  const sortedMovies = [...movies];

  if (sortFilter.value === "az") {
    sortedMovies.sort((a, b) =>
      a.Title.localeCompare(b.Title)
    );
  }

  if (sortFilter.value === "za") {
    sortedMovies.sort((a, b) =>
      b.Title.localeCompare(a.Title)
    );
  }

  if (sortFilter.value === "newest") {
    sortedMovies.sort((a, b) =>
      getYear(b.Year) - getYear(a.Year)
    );
  }

  if (sortFilter.value === "oldest") {
    sortedMovies.sort((a, b) =>
      getYear(a.Year) - getYear(b.Year)
    );
  }

  movieGrid.innerHTML = sortedMovies
    .slice(0, 20)
    .map(movie => {
      const posterAvailable =
        movie.Poster && movie.Poster !== "N/A";

      const posterHTML = posterAvailable
        ? `<img
             src="${escapeHTML(movie.Poster)}"
             alt="Poster for ${escapeHTML(movie.Title)}"
             loading="lazy"
           >`
        : `<div class="poster-placeholder">
             ${escapeHTML(movie.Title)}
           </div>`;

      return `
        <article class="movie-card">
          <div class="poster">
            ${posterHTML}
          </div>
          <h3 class="movie-title">
            ${escapeHTML(movie.Title)}
          </h3>
          <span class="movie-year">
            ${escapeHTML(movie.Year || "Unknown year")}
          </span>
        </article>
      `;
    })
    .join("");

  //----Hide the grid when no movies were found.
  movieGrid.hidden = sortedMovies.length === 0;
  emptyState.hidden = sortedMovies.length > 0;

  resultCount.textContent = sortedMovies.length
    ? `Showing ${sortedMovies.length} movies · ${totalResults} total matches`
    : "No movies found. Try another search.";

  showingFor.textContent = `Showing for: ${currentQuery}`;
}

function getYear(year) {
  const parsedYear = Number.parseInt(year, 10);
  return Number.isNaN(parsedYear) ? 0 : parsedYear;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// --------Search when the form is submitted.
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchMovies(searchInput.value);
});

//------- Re-sort the current results when the dropdown changes.
sortFilter.addEventListener("change", displayMovies);

// -------Quick-search buttons.
document.querySelectorAll("[data-query]").forEach(button => {
  button.addEventListener("click", () => {
    const query = button.dataset.query;
    searchInput.value = query;
    searchMovies(query);
  });
});

//-------- Load default results when the page opens.
searchInput.value = "Marvel";
searchMovies("Marvel");
