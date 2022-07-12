// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PriceConverter.sol";
import "hardhat/console.sol";

error FundMe__NotOwner();

/// @title A contract for crowd funding
/// @author Sorin Jitianu
/// @notice This contract is to demo a sample funding contract
/// @dev This implements price feeds as our library
contract FundMe {
    using PriceConverter for uint256;

    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;
    AggregatorV3Interface private s_priceFeed;
    address private immutable i_owner;
    uint256 public constant MINIMUM_USD = 10 * 1e18;

    modifier onlyOwner() {
        // require(msg.sender == i_owner, "Sender is not owner!");
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }
        _;
    }

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /// @notice This function funds this contract
    /// @dev This implements price feeds as our library
    function fund() public payable {
        // Want to be able to set a minimum fund amount in USD
        require(
            msg.value.getConversionRate(s_priceFeed) > MINIMUM_USD,
            "Didn't send enough!"
        );

        console.log(
            "Transferring from %s to %s %s tokens",
            msg.sender,
            address(this),
            msg.value
        );

        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] += msg.value;
    }

    /// @notice This function withdraws this contract
    function withdraw() public onlyOwner {
        for (uint256 i = 0; i < s_funders.length; i++) {
            address funder = s_funders[i];
            s_addressToAmountFunded[funder] = 0;
        }

        // reset the array
        s_funders = new address[](0);
        // actually withdraw the funds
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function cheaperWithdraw() public payable onlyOwner {
        address[] memory funders = s_funders;
        for (uint256 i = 0; i < funders.length; i++) {
            address funder = funders[i];
            s_addressToAmountFunded[funder] = 0;
        }

        s_funders = new address[](0);
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess);
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(address funder)
        public
        view
        returns (uint256)
    {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
