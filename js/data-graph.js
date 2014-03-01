// Partition the visualization space.
var margin = {top: 40, right: 30, bottom: 20, left: 30},
    width = 1280 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom,
    topHeight = Math.round(height * 0.9),
    botHeight = height - botHeight;

var fullChart = d3.select("body")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom);

var plot = fullChart.append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                     
// Load in all of the data
queue()
  .defer(d3.text, "data/biodeg.csv")
  .await(drawElements);
  
function drawElements(err, unparsedData) {
  var plotArea = plot.append("rect")
                     .attr("width", width)
                     .attr("height", topHeight)
                     .attr("fill", "#eee");
   
  var parsedCSV = d3.csv.parseRows(unparsedData);
   
  plotData(0, 1);
   
  function plotData(xdim, ydim) {
    // First we want to set up the two axes based on the values for the current dimensions
  }
}