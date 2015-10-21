// main.jsx
import React from 'react';
import ReactDOM  from 'react-dom';
import D3 from 'd3';
import ReactD3 from 'react-d3-components';
import CrossFilter from 'crossfilter';

var filename = '0_0_0.json';
var testData;

ReactDOM.render(
  <h1>Hello, world!</h1>,
  document.getElementById('example')
);

d3.json(filename, function(error, json) {
    testData = json;
    console.log('first line: ' + JSON.stringify(testData[1]));
    console.log('count: ' + testData.length);
});


var BarChart = ReactD3.BarChart;

var data = [{
    label: 'somethingA',
    values: [{x: 'SomethingA', y: 10}, {x: 'SomethingB', y: 4}, {x: 'SomethingC', y: 3}]
}];

ReactDOM.render(
    <BarChart
        data={data}
        width={400}
        height={400}
        margin={{top: 10, bottom: 50, left: 50, right: 10}}/>,
    document.getElementById('location')
);