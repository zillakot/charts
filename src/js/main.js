// main.jsx
import D3 from 'd3';
import dc from 'dc';
import nvd3 from 'nvd3';

var filename = '0_0_0.json';
var testData;

/*d3.json(filename, function(error, json) {
    testData = json;
    console.log('first line: ' + JSON.stringify(testData[1]));
    console.log('asema: ' + testData[1].Asema);
    //d3.select('body').append('p').text("testDataJee8");
});*/


d3.csv('comap.csv', function(error, pdata) {
    //testData = json;
    //console.log('first line: ' + JSON.stringify(pdata[1]));
    console.log('count: ' + pdata.length);
    //appendLog(pdata);
    pdata.forEach(function(d){
        d.rpm = parseFloat(d.rpm);
        d.kulutus = parseFloat(d.kulutus);
        d.kayttoaste = parseFloat(d.kayttoaste);
        d.nopeus = parseFloat(d.nopeus);
        d.luotsaukset = parseInt(d.luotsaukset);

        return d;
    });

    var cf = dc.crossfilter(pdata);
    var all = cf.groupAll();

    var asemaDim = cf.dimension(function(d) { return d.asema; });
    var nimiDim = cf.dimension(function(d) { return d.nimi; });
    var laivaDim = cf.dimension(function(d) { return d.laiva; });
    var rpmDim = cf.dimension(function(d) { return d.rpm; });

    var asemaGroup = asemaDim.group().reduceSum(function(d) { return d.luotsaukset; });

    var rpmGroup = rpmDim.group().reduce(
        reduceAvgAdd('kulutus'),
        reduceAvgRemove('kulutus'),
        reduceAvgInit()
    );

    var laivaNopeusGroup = laivaDim.group().reduce(
        reduceAvgAdd('nopeus'),
        reduceAvgRemove('nopeus'),
        reduceAvgInit()
    );

    var laivaLuotsauksetGroup = nimiDim.group().reduce(
        reduceAvgAdd('luotsaukset'),
        reduceAvgRemove('luotsaukset'),
        reduceAvgInit()
    );


    var a = asemaDim.group().top(Infinity);

    a.forEach(function(p,i){
        console.log(p.key + ": " + p.value);
    });

    console.log(JSON.stringify(a));

    dc.pieChart("#la")
        .width(400)
        .height(200)
        .dimension(asemaDim)
        .group(asemaGroup)
        .innerRadius(50);

    BarChart(nimiDim, laivaLuotsauksetGroup, '#lv', 'Laiva', 'Luotsaukset')
        .valueAccessor(function(p){return p.value.avg;});
    BarChart(laivaDim, laivaNopeusGroup, '#ln', 'Laiva', 'Keskinopeus')
        .valueAccessor(function(p){return p.value.avg;});

    BarChart(rpmDim, rpmGroup, '#rpm', 'RPM', 'Kulutus')
        .valueAccessor(function(p){return p.value.sum;})
        .width(1200)
        .height(200);

    dc.dataCount('#data-count')
        .dimension(cf)
        .group(all)
        .html({
            some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
            ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'\'>Reset All</a>',
            all: 'All records selected. Please click on the graph to apply filters.'
        });


    dc.renderAll();
});

function appendLog(data){
    return d3.select('#example')
        .data(data)
        .enter()
        .append('p')
        .text(function(d){return JSON.stringify(d);});
}

function BarChart(dim, group, id, xlabel, ylabel, valueAccessor){
    var c = dc.barChart(id)
        .width(400)
        .height(200)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .yAxisLabel(ylabel)
        .xAxisLabel(xlabel)
        .dimension(dim)
        .group(group);

    return c;
}

function reduceAvgAdd(key){
    return function(p,v){
        ++p.count;
        p.sum += v[key];
        p.avg = p.sum / p.count;
        return p;
    }
}

function reduceAvgRemove(key){
    return function(p,v){
        --p.count;
        p.sum -= v[key];
        p.avg = p.count ? p.sum / p.count : 0;
        return p;
    }
}

function reduceAvgInit(){
    return function(){
        return {count: 0, sum: 0, avg: 0};
    }
}