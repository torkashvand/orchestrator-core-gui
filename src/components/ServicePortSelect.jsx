import React from "react";
import PropTypes from "prop-types";
import Select from "react-select";

export default class ServicePortSelect extends React.PureComponent {
    label = (servicePort, organisations) => {
        const organisation = organisations.find(org => org.uuid === servicePort.customer_id);
        const organisationName = organisation ? organisation.name : "";
        const description = servicePort.description || "<No description>";
        const crm_port_id = servicePort.crm_port_id || "<No CRM port ID>";
        return `${crm_port_id} - ${servicePort.subscription_id.substring(
            0,
            8
        )} ${description.trim()} ${organisationName}`;
    };

    render() {
        const { onChange, servicePort, servicePorts, organisations, disabled } = this.props;

        const options = servicePorts
            .map(aServicePort => ({
                value: aServicePort.subscription_id,
                label: this.label(aServicePort, organisations),
                tag: aServicePort.product.tag
            }))
            .sort((x, y) => x.label.localeCompare(y.label));
        const value = options.find(option => option.value === servicePort);

        return (
            <Select
                onChange={onChange}
                options={options}
                value={value}
                isSearchable={true}
                isDisabled={disabled || servicePorts.length === 0}
            />
        );
    }
}

ServicePortSelect.propTypes = {
    onChange: PropTypes.func.isRequired,
    servicePorts: PropTypes.array.isRequired,
    servicePort: PropTypes.string,
    organisations: PropTypes.array.isRequired,
    disabled: PropTypes.bool
};
