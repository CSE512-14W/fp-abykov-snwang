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
var plotPadding = 30;
                    
// Load in all of the data
queue()
  .defer(d3.text, "data/biodeg.csv")
  .await(drawElements);
  
function drawElements(err, unparsedData) {
  var parsedData = d3.csv.parseRows(unparsedData);
   
  plotData(0, 1);
   
  function plotData(xdim, ydim) {
    var plotArea = plot.append("rect")
                       .attr("x", plotPadding)
                       .attr("width", width - plotPadding)
                       .attr("height", topHeight - plotPadding)
                       .attr("fill", "#eee")
                       .attr("opacity", 0.5);
  
    // First we want to get the data for each dimension
    // Additionally we want to keep track of the minX, maxX, minY and maxY values for the axes
    var plotData = new Array();
    var minX = parsedData[0][xdim];
    var maxX = parsedData[0][xdim];
    var minY = parsedData[0][ydim];
    var maxY = parsedData[0][ydim];
    for (var i = 0; i < parsedData.length; i++) {
      var x = parsedData[i][xdim];
      var y = parsedData[i][ydim];
      if (x < minX) {
        minX = x;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (y > maxY) {
        maxY = y;
      }
      plotData.push([x, y]);
    }
    
    // Set up the axes
    var xScale = d3.scale.linear()
                   .domain([minX, maxX])
                   .range([plotPadding, width]);
    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .ticks(10);
    var yScale = d3.scale.linear()
                   .domain([minY, maxY])
                   .range([topHeight - plotPadding, 0]);
    var yAxis = d3.svg.axis()
                      .scale(yScale)
                      .orient("left")
                      .ticks(10);
    
    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (topHeight - plotPadding) + ")")
        .call(xAxis);
    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (plotPadding - 1) + ", 0)")
        .call(yAxis);
  }
}