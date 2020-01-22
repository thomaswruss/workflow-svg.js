var WorkflowSVG = (function () {
    const PADDING = 50;
    const MARGIN = 50;
    var _json = { entries:[]};
    var _draw;
    var _selectedPoints = [];
    var _lines = [];
    var _documentLoaded = false;
    var _callbacks = {};

    function initalize(id, width, height){
        SVG.on(document, 'DOMContentLoaded', function() {
            _draw = SVG().addTo(id).size(width, height);
            _draw.entries = [];
            _draw.lines = _draw.group();
        });
    }       
    
    function _createEntity(_draw, entry) {
        var group = _draw.group().attr({id: entry.id});
        _draw.entries.push(group);

        //default values
        entry.backgroundcolor = entry.backgroundcolor ? entry.backgroundcolor : '#f06';
        entry.color = entry.color ? entry.color : '#ffffff';
        entry.radius = entry.radius ? entry.radius : 0;

        group.dragPoints = [];

        //the real entity
        group.entity = group.rect(entry.width, entry.height)
            .move(entry.x, entry.y)
            .attr({ fill: entry.backgroundcolor })
            .radius(entry.radius);

        if(entry.class){
            group.entity.attr("class", entry.class);
        }
  
        group.text(entry.text)
            .cx(entry.x+(entry.width/2))
            .cy(entry.y+(entry.height/2))
            .attr({ fill: entry.color})
            .font({
                family: 'Helvetica'
            });

        group.arrows = group.group();

        var hoverArea = group.rect(entry.width+MARGIN, entry.height+MARGIN)
                            .move(entry.x-(MARGIN/2),entry.y-(MARGIN/2))
                            .attr({ opacity: '0', fill:'#FFBF00'});
        
        group.dragGroup = group.group(); 

        //dragabble area
        group.rect(entry.width-PADDING, entry.height-PADDING)
            .move(entry.x+(PADDING/2),entry.y+(PADDING/2))
            .attr({ opacity: '0' })
            .draggable()
            .on('dragmove.namespace', (e) => {
                e.preventDefault();
                var box = e.detail.box;
                group.move(box.x-(PADDING), box.y-(PADDING));  
                entry.x =  box.x-(PADDING);
                entry.y =  box.y-(PADDING);       
                _renderPolylines(_draw, _lines);
            })
            .on('dragend', (e) => {
                _call('entity:moved',  _getIdFromEntity(e));
            })
            .on('click', (e) => {
                _call('entity:clicked', _getIdFromEntity(e));
            });

        // if hovering - show drag points
        hoverArea.on('mouseover', function(evt){
            _renderPoint(_draw, group, 'top');
            _renderPoint(_draw, group, 'right');
            _renderPoint(_draw, group, 'bottom');
            _renderPoint(_draw, group, 'left');
            evt.stopPropagation();
        });

        // if hovering outside - remove drag points (except the one selected)
        _draw.on('mouseover', function(){
            group.dragPoints.forEach(d => {
                    if(!_selectedPoints.includes(d)){
                        d.remove();
                    }
            });
        });
    }

    function _renderPoint(_draw, group, id){
        var x = _calculateX(group.entity, id);
        var y = _calculateY(group.entity, id);
        group.dragPoints.push(group.dragGroup.circle(10, 10)
                .attr({ fill:'white', stroke:'#d4d4d4', id: id})
                .move(x-5, y-5)
                .on('mouseover', function(evt){
                    // make point bigger
                    this.transform({scale: 2});
                    evt.stopPropagation();
                })
                .on('click', function(){
                    if(!_selectedPoints.includes(this)){
                        _selectedPoints.push(this);
                        if(_selectedPoints.length == 2){
                            var newLine = {
                                id: 'line-'+_lines.length,
                                from: {
                                    element: _selectedPoints[0].parent().parent().attr('id'),
                                    point: _selectedPoints[0].attr('id'),
                                },
                                to: {
                                    element: _selectedPoints[1].parent().parent().attr('id'),
                                    point: _selectedPoints[1].attr('id')
                                }
                            };
                            _lines.push(newLine);
                            _json.lines.push(_copy(newLine));
                            _renderPolylines(_draw, _lines);
                            _selectedPoints = [];
                            _call('line:added', newLine);
                        } 
                    }else{
                        _selectedPoints = [];
                    }
                })
                .on('mouseout', function(evt){
                    if(!_selectedPoints.includes(this)){
                        this.transform({scale: 1});
                    }
                
                    evt.stopPropagation();
                })
            );
    }

    function _renderPolylines(_draw, _lines){
        _lines.forEach(line => _renderOnePolyline(_draw, line));
    }

    function _renderOnePolyline(_draw, line){
        var polyline = '';
        var line_color = _json.configuration.line_color ? _json.configuration.line_color : 'black';
        var from = _draw.findOne('#'+line.from.element);
        var to = _draw.findOne('#'+line.to.element);
        var pointsInBetween = _calculatePointsInBetween(line, from, to);

        //start point
        polyline += _calculateX(from.entity, line.from.point) +','+_calculateY(from.entity, line.from.point)+' ';
        
        // points between them
        pointsInBetween.forEach(p => polyline += p.x +','+ p.y +' ');

        //end point - we have to cut a little bit because of the arrow
        if(line.to.point === "top"){
            polyline += _calculateX(to.entity, line.to.point) +','+(_calculateY(to.entity, line.to.point)-5)+' ';
        } else if(line.to.point === "right") {
            polyline += (_calculateX(to.entity, line.to.point)+5) +','+_calculateY(to.entity, line.to.point)+' ';
        } else if(line.to.point === "bottom"){
            polyline += _calculateX(to.entity, line.to.point) +','+(_calculateY(to.entity, line.to.point)+5)+' ';
        } else{
            polyline += (_calculateX(to.entity, line.to.point)-5) +','+_calculateY(to.entity, line.to.point)+' ';
        }

        if(!line.polyline){
            line.polyline = _draw.lines.polyline(polyline)
                .fill('none')
                .stroke({ color: line_color, width: 4, linecap: 'round', linejoin: 'round' })
                .on('click', (e) => {
                    _call('line:clicked', e.target.id);
                })
                .attr('id', line.id);
; 
        }else{
            line.polyline.plot(polyline);
        }

        _renderArrow(line, to, line_color);

    }

    function _renderArrow(line, to, line_color){
        if(!line.to.arrow){
            if(_json.configuration.arrow_type==='default'){
                var arrow = _calculateX(to.entity, line.to.point) +','+_calculateY(to.entity, line.to.point) + ' ';
                if(line.to.point === 'top'){
                    arrow += (_calculateX(to.entity, line.to.point)+7) +','+(_calculateY(to.entity, line.to.point)-14) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)-7) +','+(_calculateY(to.entity, line.to.point)-14) + ' ';
                } else if(line.to.point === 'right'){
                    arrow += (_calculateX(to.entity, line.to.point)+14) +','+(_calculateY(to.entity, line.to.point)-7) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)+14) +','+(_calculateY(to.entity, line.to.point)+7) + ' ';
                } else if(line.to.point === 'bottom'){
                    arrow += (_calculateX(to.entity, line.to.point)+7) +','+(_calculateY(to.entity, line.to.point)+14) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)-7) +','+(_calculateY(to.entity, line.to.point)+14) + ' ';
                } else {
                    arrow += (_calculateX(to.entity, line.to.point)-14) +','+(_calculateY(to.entity, line.to.point)-7) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)-14) +','+(_calculateY(to.entity, line.to.point)+7) + ' ';
                }
                line.to.arrow = to.arrows.polygon(arrow).fill(line_color).stroke({ width: 1 });
            }
        }
    }

    function _calculatePointsInBetween(line, from, to){
        var pointsInBetween = [];

        var y1 = _calculateY(from.entity, line.from.point);
        var y2 = _calculateY(to.entity, line.to.point);
        var x1 = _calculateX(from.entity, line.from.point);
        var x2 = _calculateX(to.entity, line.to.point);

        var p1 = _translatePositionToNumber(line.from.point);
        var p2 = _translatePositionToNumber(line.to.point);
        var code = p1-p2; 

        // same position
        if(code === 0) {
            if(line.from.point === 'top'){
                if( y1 <= y2) {
                    pointsInBetween.push({x: x1, y:y1-20});
                    pointsInBetween.push({x: x2, y:y1-20});
                } else {
                    pointsInBetween.push({x: x1, y:y2-20});
                    pointsInBetween.push({x: x2, y:y2-20});
                }
            } else if(line.from.point === 'bottom'){
                if( y1 <= y2) {
                    pointsInBetween.push({x: x1, y:y2+20});
                    pointsInBetween.push({x: x2, y:y2+20});
                } else {
                    pointsInBetween.push({x: x1, y:y1+20});
                    pointsInBetween.push({x: x2, y:y1+20});
                }
            } else if(line.from.point === 'left') {
                if( x1 <= x2) {
                    pointsInBetween.push({x: x1-20, y:y1});
                    pointsInBetween.push({x: x1-20, y:y2});
                } else {
                    pointsInBetween.push({x: x2-20, y:y1});
                    pointsInBetween.push({x: x2-20, y:y2});
                }
            } else{
                if( x1 <= x2) {
                    pointsInBetween.push({x: x2+20, y:y1});
                    pointsInBetween.push({x: x2+20, y:y2});
                } else {
                    pointsInBetween.push({x: x1+20, y:y1});
                    pointsInBetween.push({x: x1+20, y:y2});
                }
            }
        }

        // on the opposite site
        if(code === 2 || code === -2){
            if(line.from.point === 'left' || line.from.point === 'right'){
                 if(y1 !== y2){
                        pointsInBetween.push({x: x1+((x2-x1)/2), y: y1});
                        pointsInBetween.push({x: x1+((x2-x1)/2), y: y2});  
                }
            } else{ // top or bottom
                if(x1 !== x2){
                        pointsInBetween.push({x: x1, y: y2+((y1-y2)/2)});
                        pointsInBetween.push({x: x2, y: y2+((y1-y2)/2)});
                }
            }
        }

        // corner cases
        if(code === 1 || code === -1 || code === 3 || code === -3){
            if(line.from.point === 'top' ){
                if(y1 <= y2){
                    pointsInBetween.push({x: x1, y:y1-20});
    
                    if(line.to.point === 'left'){
                        pointsInBetween.push({x: x2-20,  y:y1-20});
                        pointsInBetween.push({x: x2-20,  y:y2});
                    } else{
                        pointsInBetween.push({x: x2+20,  y:y1-20});
                        pointsInBetween.push({x: x2+20,  y:y2});
                    }
    
                } else {
                    pointsInBetween.push({x: x1, y:y2});
                }
            }

            if(line.from.point === 'bottom'){
                if(y1 >= y2){
                    pointsInBetween.push({x: x1, y:y1+20});
                    if(line.to.point === 'left'){
                        pointsInBetween.push({x: x2-20,  y:y1+20});
                        pointsInBetween.push({x: x2-20,  y:y2});
                    }else{
                        pointsInBetween.push({x: x2+20,  y:y1+20});
                        pointsInBetween.push({x: x2+20,  y:y2});
                    }
                    
                } else {
                    pointsInBetween.push({x: x1, y:y2});
                }
            }

            if(line.from.point === 'left'){
                if(y1 > y2){
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x1-20,  y:y1});
                        pointsInBetween.push({x: x1-20,  y:y2-20});
                        pointsInBetween.push({x: x2, y:y2-20});
                    }else{
                        pointsInBetween.push({x: x2, y:y1});
                    }
                    
                } else {
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x2, y:y1});
                    } else{
                        pointsInBetween.push({x: x1-20,  y:y1});
                        pointsInBetween.push({x: x1-20,  y:y2+20});
                        pointsInBetween.push({x: x2, y:y2+20});
                    }
                }
            }

            if(line.from.point === 'right'){
                if(y1 > y2){
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x1+20,  y:y1});
                        pointsInBetween.push({x: x1+20,  y:y2-20});
                        pointsInBetween.push({x: x2, y:y2-20});
                    }else{
                        pointsInBetween.push({x: x2, y:y1});
                    }
                    
                } else {
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x2, y:y1});
                    } else{
                        pointsInBetween.push({x: x1+20,  y:y1});
                        pointsInBetween.push({x: x1+20,  y:y2+20});
                        pointsInBetween.push({x: x2, y:y2+20});
                    }
                }
            }
        }

        return pointsInBetween;
    }

    function _translatePositionToNumber(position){
        switch(position){
            case 'top': return 0;
            case 'right': return 1;
            case 'bottom': return 2;
            default: return 3;
        }
    }

    function _calculateX(entity, position){
        switch(position){
            case 'right':
                return entity.attr('width')+entity.attr('x');
            case 'top':
                return  (entity.attr('width')/2)+entity.attr('x');
            case 'bottom':
                return (entity.attr('width')/2)+entity.attr('x');
            default:
                return entity.attr('x')

        }
    }

    function _calculateY(entity, position){
        switch(position){
            case 'right':
                return (entity.attr('height')/2)+entity.attr('y');
            case 'top':
                return entity.attr('y');
            case 'bottom':
                return entity.attr('height')+entity.attr('y')
            default:
                return (entity.attr('height')/2)+entity.attr('y');
        }       
    }

    function _copy(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    function _update(){
        _draw.entries.forEach(entry => entry.remove());
        _draw.entries = [];

        _lines.forEach(arrow => arrow.remove());
        _lines = [];

        _selectedPoints = [];

        _json.entries.forEach(entry => _createEntity(_draw, entry));

        _lines = _copy(_json.lines);

        _renderPolylines(_draw, _lines);

    }

    function _call(eventname, obj){
        if(_callbacks[eventname] !== null && _callbacks[eventname] !== undefined){
            _callbacks[eventname].forEach(callback => callback(obj));
        }
    }

    function _getIdFromEntity(e){
        var id = '';
        if(e && e.target && e.target.parentElement){
            id = e.target.parentElement.id;
        }
        return id;
    }
    
    function update(json){
        _json = _copy(json);
        if(!_documentLoaded){
            SVG.on(document, 'DOMContentLoaded', function() {
                _update();
                _documentLoaded = true;
            });
        }else{
            _update();
        }
    }

    function register(eventname, callback){
        if(_callbacks[eventname] === null || _callbacks[eventname] === undefined){
            _callbacks[eventname] = [];
        }

        _callbacks[eventname].push(callback);
    }

    function get(){
        return _json;
    }

    return {
        initalize: initalize,
        update: update,
        register: register,
        get: get
    }
});