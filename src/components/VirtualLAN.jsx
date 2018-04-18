import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";
import {usedVlans, usedVlansFiltered} from "../api"
import "react-select/dist/react-select.css";
import {isEmpty} from "../utils/Utils";
import {doValidateUserInput} from "../validations/UserInput";

export default class VirtualLAN extends React.PureComponent {

    constructor(props) {
        super(props);
        this.state = {
            usedVlans: [],
            vlansInUse: []
        }
    }

    componentDidMount = (subscriptionIdMSP = this.props.subscriptionIdMSP) => {
        if (subscriptionIdMSP) {
            const {imsCircuitId} = this.props;
            const promise = imsCircuitId ? usedVlansFiltered(subscriptionIdMSP, imsCircuitId) : usedVlans(subscriptionIdMSP);
            promise.then(result => this.setState({usedVlans: result}));
        }
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.subscriptionIdMSP && nextProps.subscriptionIdMSP !== this.props.subscriptionIdMSP) {
            this.componentDidMount(nextProps.subscriptionIdMSP);
        } else if (isEmpty(nextProps.subscriptionIdMSP)) {
            this.setState({usedVlans: []})
        }
    };

    vlansInUse = (vlanRange, usedVlans) => {
        const errors = {};
        doValidateUserInput({name: "t", type: "vlan_range"}, vlanRange, errors);
        if (errors["t"]) {
            //semantically invalid so we don't validate against the already used ports
            return [];
        }
        const numbers = this.getAllNumbersForVlanRange(vlanRange);
        return numbers.filter(num => usedVlans.some(used => used.length > 1 ? num >= used[0] && num <= used[1] : num === used[0]));
    };

    getAllNumbersForVlanRange = vlanRange => {
        const numbers = vlanRange.replace(/ /g, "").split(",").reduce((acc, val) => {
            const boundaries = val.split("-");
            const max = parseInt(boundaries[boundaries.length - 1], 10);
            const min = parseInt(boundaries[0], 10);
            return acc.concat(Array.from(new Array(max - min + 1), (x, i) => min + i))
        }, []);
        return numbers;
    };

    validateUsedVlans = e => {
        const {onBlur} = this.props;
        const {usedVlans} = this.state;
        const vlanRange = e.target.value;
        const inUse = this.vlansInUse(vlanRange, usedVlans);
        this.setState({vlansInUse: inUse});
        onBlur(e);
    };

    render() {
        const {usedVlans, vlansInUse} = this.state;
        const {onChange, vlan, subscriptionIdMSP, disabled, placeholder} = this.props;
        const showAllPortsAvailable = subscriptionIdMSP && isEmpty(usedVlans);
        const showWhichPortsAreInUse = !isEmpty(usedVlans) && !disabled;
        const derivedPlaceholder = placeholder || (subscriptionIdMSP ? I18n.t("vlan.placeholder") : I18n.t("vlan.placeholder_no_msp"));
        return (
            <div className="virtual-vlan">
                <input type="text" value={vlan || ""} placeholder={derivedPlaceholder}
                       disabled={!subscriptionIdMSP || disabled}
                       onChange={onChange} onBlur={this.validateUsedVlans}/>
                {!isEmpty(vlansInUse) &&
                <em className="error">{I18n.t("vlan.vlansInUseError", {vlans: vlansInUse.join(", ")})}</em>}
                {showWhichPortsAreInUse && <em>{I18n.t("vlan.vlansInUse", {vlans: usedVlans.map(arr => arr.join("-")).join(", ")})}</em>}
                {showAllPortsAvailable && <em>{I18n.t("vlan.allPortsAvailable")}</em>}
            </div>
        )
    }

}

VirtualLAN.propTypes = {
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func.isRequired,
    vlan: PropTypes.string,
    subscriptionIdMSP: PropTypes.string,
    imsCircuitId: PropTypes.string,
    disabled: PropTypes.bool,
    placeholder:  PropTypes.string
};
