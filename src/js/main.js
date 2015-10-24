// main.jsx
import D3 from 'd3';
import dc from 'dc';

var filename = '0_0_0.json';
var testData;

d3.json(filename, function(error, json) {
    testData = json;
    console.log('first line: ' + JSON.stringify(testData[1]));
    console.log('count: ' + testData.length);
    //d3.select('body').append('p').text("testDataJee8");
});


d3.csv('comap.csv', function(error, pdata) {
    //testData = json;
    console.log('first line: ' + pdata[1]);
    console.log('count: ' + pdata.length);
    appendLog(pdata);

    var comap = crossfilter(pdata);
    var all = comap.groupAll();



    var asemaDim = comap.dimension(function(d) {
        return d.Asema
    });

    var asemaGroup = asemaDim.group().reduceSum(function(d) {
       return comap.luotsaukset;
    });

    /*dc.barChart('#location')
        .width(420)
        .height(180)
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(asemaDim)
        .group(asemaGroup)
        .elasticY(true)
        .gap(1)
        .x(d3.scale.ordinal());

    dc.renderAll();*/

});

function appendLog(data){
    return d3.select('#example')
        .data(data)
        .enter()
        .append('p')
        .text(function(d){return JSON.stringify(d);});
}