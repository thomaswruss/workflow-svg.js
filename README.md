# workflow-svg.js
*workflow-svg.js* is a JS Library to present and edit workflows as SVG. You can move entities and define connections between them. It is simple to include and configure it for your project. Take a look at a real example on [https://thomaswruss.github.io/workflow-svg.js/](https://thomaswruss.github.io/workflow-svg.js/).

## How to import
*workflow-svg.js* is a self containing library and has some requirements that has to be imported first:
* svg.js (@svgdotjs/svg.js@3.0/dist/svg.min.js)
* svg.draggable.js (@svgdotjs/svg.draggable.js/dist/svg.draggable.js)

If you want to be compatible with IE11 you have to import svg.js Polyfills at the beginning:
* @svgdotjs/svg.js@3.0/dist/polyfills.js
* @svgdotjs/svg.js@3.0/dist/polyfillsIE.js 

And of course you have to import the library itself:

`<script src="./node_modules/workflow-svg.js@0.0.1/lib/workflow-svg.minified.js"></script>`

In `./docs/index.html` and `./test.html` you can find examples how to include, call and work with the library.

## How to use

Create a new *workflow-svg.js* instance with `new WorkflowSVG();`. The object has the following methods.

|Method| Description|
|---|---|
|initalize(id, width, height)| Has to be called to initalize the SVG. 'id' is the `<div>` Element where the SVG should be rendered with the defined 'width' and 'height'|
|update(json)| Update the SVG with the defined 'json'|
|register(eventname, callback)| Register your callback for some event (eventname).|
|get()| Get the JSON configuration of your *workflow-svg.js* instance|

|Eventname| Description|
|---|---|
|entity:moved| Event when some entity was moved|
|entity:clicked| Event when some entity was clicked|
|line:added| Event when a line was added between some entity|
|line:clicked| Event when some line was clicked|
| label:moved | Event when some label was moved|

You always get the ID of the related entity/line.

## JSON
The JSON contains of three fields.

|Field| Type| Description|
|---|---|---|
| entities | array | Entities of a workflow.|
| lines | array | Lines between the entities.|
| labels | array | Some labels to display.|
| configuration | object| Defines some configuration that will be applied to the whole chart.|

The fields are explained now into more detail.
### entities
One entity in the array contains the following attributes:

|Attribute| Type| Description|
|---|---|---|
|id| string | Unique id of the entity|
|text| string | Text of the entity |
|displaytype| string | Type of entity. Default is 'entity'. For workflow operations use: 'operation' |
|x| integer | X coordinate of the entity |
|y| integer | Y coordinate of the entity |
|backgroundcolor| string(hex) | Background Color of the entity|
|color| string(hex) | Font Color of the entity |
|faicon|string|Class Name for Font Awesome 4 or 5 (they have to be imported separately)|
|radius| integer| Radius of the corners of the entity |
|class|string|Class Name for css styling|

### lines
One line in the array contains the following attributes:

|Attribute| Type| Description|
|---|---|---|
|id| string | Unique id of the line|
|from| object| Object that contains: <br>- 'element' - the id from the source entity, <br>- 'point' - where the line starts at this entity (top, right, bottom, left)|
|to| object| Object that contains: <br>- 'element' - the id from the target entity, <br>- 'point' - where the line ends at this entity (top, right, bottom, left)|

### labels
One label in the array contains the following attributes:

|Attribute| Type| Description|
|---|---|---|
|id| string | Unique id of the label|
|value| string| The text of the label|
|x| integer | X coordinate of the label |
|y| integer | Y coordinate of the label |
|color| string(hex) | Font Color of the label |

### configuration
The configuration contains the following attributes:

|Attribute| Type| Description| Default value |
|---|---|---|---|
| line_color | string(hex) | Color of all lines| '#000000' (=black) |
| arrow_type | 'default' or 'none'| At the moment there are only two arrow type: default or none| 'default'|
| readonly | boolean |If true, the chart will be readonly| false |
| grid_type | 'static' or 'dynamic' | If 'static' - grid lines will always be shown. Otherwise the grid line will only be shown if the dragged entity is near enough -tjis is called 'dynamic'. | 'dynamic' |
| grid_x | array | Array of objects <br> - 'value': the x coordinate of the line <br> - 'width': width of the line <br> - 'color': color of the line | [] | 
| grid_y | array | Array of objects <br> - 'value': the y coordinate of the line <br> - 'width': width of the line <br> - 'color': color of the line | [] |

The configuration is completely optional. All non-existent values ​​are set automatically.
