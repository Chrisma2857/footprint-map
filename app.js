// 此处必须要用原生js写法
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

// 地图中心点，陕西
var centerPoint = [109.132287, 35.63452];

// 创建地图
// 实例化Map对象加载地图
var map = new ol.Map({
  target: 'map',
  // 地图容器中加载的图层
  layers: [
    new ol.layer.Tile({
      source: new ol.source.TileArcGISRest({
        url: 'http://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer'
      })
    })
  ],
  // 地图视图设置
  view: new ol.View({
    // 地图初始中心点
    center: ol.proj.fromLonLat(centerPoint),
    // 地图初始显示级别
    zoom: 4,
    //最小级别
    minZoom: 1,
    // 最大级别
    maxZoom: 16
  })
});

//实例化一个矢量图层Vector作为绘制层
var source = new ol.source.Vector({});
var vector = new ol.layer.Vector({
  source: source,
  style: new ol.style.Style({
    // 图标
    image: new ol.style.Icon({
      anchor: [0.5, 0.5],
      anchorOrigin: 'top-right',
      anchorXUnits: 'fraction', //以小数为单位
      anchorYUnits: 'fraction', //以像素为单位
      offsetOrigin: 'top-right',
      // size: [28, 28],
      // offset:[0,10],
      color: 'white',
      scale: 0.5,  //图标缩放比例
      // opacity: 0.75, //透明度
      src: './foot.png' //图标的url
    })
  })
});
map.addLayer(vector);

/**
  * 在地图容器中创建一个Overlay
  */
var popup = new ol.Overlay( /** @type {olx.OverlayOptions} */({
  element: container,
  autoPan: true,
  positioning: 'center-center',
  stopEvent: false,
  autoPanAnimation: {
    duration: 250
  }
}));
map.addOverlay(popup);

//关闭弹窗
closer.onclick = function () {
  popup.setPosition(undefined);
  closer.blur();
  return false;
};

// 获取数据
$.get('./data/data.json', function (result) {
  // console.log(result);
  // result = JSON.parse(result);
  drawFootPoint(result.rows);
});

/* 根据坐标点数据绘制Marker */
function drawFootPoint(data) {
  for (var i = 0; i < data.length; i++) {
    var p = data[i];
    var point = [p.longitude - 0, p.latitude - 0];
    var pointF = new ol.geom.Point(point);
    // 将照片name转换为字符串
    // console.log(p.imgs.length);
    var imgs = "";
    if (p.imgs !== undefined) {
      for (var j = 0; j < p.imgs.length; j++) {
        if (j <= p.imgs.length - 2) {
          imgs += p.imgs[j] + ',';
        } else {
          imgs += p.imgs[j];
        }
      }
    }

    // console.log(i,imgs);

    // 坐标转换（4326 => 3857）
    pointF = pointF.clone().transform('EPSG:4326', 'EPSG:3857');
    var pointFeature = new ol.Feature({
      geometry: pointF,
      city: p['city'],
      date: p['date'],
      remark: p['remark'],
      imgs: imgs
    });

    source.addFeature(pointFeature);
  }
}

/**
 * 为map添加鼠标移动事件监听，当指向标注时改变鼠标光标状态
 */
map.on('pointermove', function (e) {
  var pixel = map.getEventPixel(e.originalEvent);
  var hit = map.hasFeatureAtPixel(pixel);
  map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});

/**
 * 为map添加点击事件监听，渲染弹出popup
 */
map.on('click', function (evt) {
  popup.setPosition(undefined); //未定义popup位置
  closer.blur(); //失去焦点
  var coordinate = evt.coordinate;
  // console.log(ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326'));

  //判断当前单击处是否有要素，捕获到要素时弹出popup
  var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    return feature;
  });
  if (feature) {
    // debugger
    content.innerHTML = ''; //清空popup的内容容器
    addFeatrueInfo(feature); //在popup中加载当前要素的具体信息
    if (popup.getPosition() == undefined) {
      popup.setPosition(coordinate); //设置popup的位置
      // 弹出popup后，视图会移动，此处重新设置中心点，保证视图不移动
      // map.getView().setCenter(coordinate);
    }
  }
});

/**
 * 动态创建popup的具体内容
 * @param {ol.feature} feature 
 */
function addFeatrueInfo(feature) {
  var city = feature.get('city');
  var date = feature.get('date');
  var remark = feature.get('remark');
  var imgs = feature.get('imgs');
  // console.log(imgs);

  content.innerHTML = '<h3>' +
    city +
    '</h3>' +
    date +
    '<br>' +
    remark +
    '<br>' +
    generatePicHtml(imgs);
}

/**
 * veiwerjs预览大图
 */
function viewPic() {
  var galley = document.getElementById('galley');
  var viewer = new Viewer(galley, {
    url: 'data-original',
    hidden: function () {
      viewer.destroy();
    }
  });
  viewer.show();
}

/**
 * 动态拼接html字符串
 * @param {string} cityName 城市名称
 * @param {*} imgs 足迹点数据中的imgs数组
 */
function generatePicHtml(images) {
  if (images == "") {
    return "";
  } else {
    // 将字符串拆分数组
    imgs = images.split(',');
    // 动态拼接html字符串
    var _html = '<div id="galley"><ul class="pictures"  onclick="viewPic()">';
    // 循环图片数组，动态拼接项目的相对地址url
    for (var i = 0; i < imgs.length; i++) {
      var url = './data/pictures/' + imgs[i];
      var display = 'style="display:inline-block"';
      // 图片超过6张，多余隐藏
      if (i > 5) {
        display = 'style="display:none"';
      }
      _html +=
        '<li ' +
        display +
        '><img data-original="' +
        url +
        '" src="' +
        url +
        '" alt="图片预览"></li>';
    }
    _html += '</ul></div></div>';

    return _html;
  }
}

/* function generatePicHtml(cityName, urls) {
    var _html = '<div id="galley"><ul class="pictures" onclick="viewPic(\'' + cityName + '\')">';
    for (var i = 0; i < urls.length; i++) {
        var url = './data/pictures/' + urls[i];
        var display = 'style="display:inline-block"';
        if (i > 5) {
            display = 'style="display:none"';
        }
        _html += '<li ' + display + '><img data-original="' + url + '" src="' + url + '" alt="图片预览"></li>';
    }
    _html += '</ul></div></div>';

    return _html;
} */
