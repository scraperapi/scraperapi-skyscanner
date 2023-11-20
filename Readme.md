# Skyscanner Scrape Sample

The purpose of this sample code is to demonstrate how to scrape data from skyscanner flight information page.
The basic approach taken is to, based on an analysis of the network calls the site makes, replicate those
these using scraperapi API calls to retrieve data.  This approach has two fairly significant benefits:

1. It minimises the number of API calls used to retrieve data and hence cost;
2. Data is retrieved in JSON, minimisng the additional work required to transform HTML into a more usable format.

## Installation

To install dependencies, simply run `npm init` in the root directory of the project.

## Execution

To run the sample, simply run `npm run start` in the root directory of the project.
