import {CirclePanel} from "Potree"

function overrideCirclePanel() {
    CirclePanel.prototype.update = function () {
        let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
        elCoordiantesContainer.empty();
        elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

        const elInfos = this.elContent.find(`#infos_table`);

        if(this.measurement.points.length !== 3){
            elInfos.empty();

            return;
        }

        const A = this.measurement.points[0].position;
        const B = this.measurement.points[1].position;
        const C = this.measurement.points[2].position;

        // reality custom code
        if(A.equals(B) || B.equals(C)){
            elInfos.empty();

            return;
        }
        // end reality custom code

        const center = Potree.Utils.computeCircleCenter(A, B, C);
        const radius = center.distanceTo(A);
        const circumference = 2 * Math.PI * radius;

        const format = (number) => {
            return Potree.Utils.addCommas(number.toFixed(3));
        };


        const txtCenter = `${format(center.x)} ${format(center.y)} ${format(center.z)}`;
        const txtRadius = format(radius);
        const txtCircumference = format(circumference);

        const thStyle = `style="text-align: left"`;
        const tdStyle = `style="width: 100%; padding: 5px;"`;

        elInfos.html(`
			<tr>
				<th ${thStyle}>Center: </th>
				<td ${tdStyle}></td>
			</tr>
			<tr>
				<td ${tdStyle} colspan="2">
					${txtCenter}
				</td>
			</tr>
			<tr>
				<th ${thStyle}>Radius: </th>
				<td ${tdStyle}>${txtRadius}</td>
			</tr>
			<tr>
				<th ${thStyle}>Circumference: </th>
				<td ${tdStyle}>${txtCircumference}</td>
			</tr>
		`);
    }
}

export {overrideCirclePanel}